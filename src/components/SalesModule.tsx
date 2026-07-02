import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRole, mapUserFieldsFromDb } from './RoleContext';
import { supabaseClient } from '../supabaseClient';
import { 
  Plus, Edit, CheckSquare, Search, Filter, Ban, X, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Users, ArrowRight, ChevronDown, Check, Package, Trash2
} from 'lucide-react';
import { Lead, CurrentStage, LeadPackage, EVENT_TYPES, PACKAGE_CATEGORIES } from '../types';
import { StatusText } from './ui/StatusText';
import { CameraLensStatsCard, CameraLensTheme } from './CameraLensStatsCard';
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour, getCustomers, triggerAutoScrollAndFocus, normalizeCategory } from '../utils';
import { SalesCalendar } from './SalesCalendar';
import { AddressAutocomplete } from './AddressAutocomplete';
import { jsPDF } from 'jspdf';

const getLogoBase64FromUrl = (url: string): Promise<{ base64: string; aspect: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          const aspect = img.naturalWidth / img.naturalHeight;
          resolve({ base64: dataURL, aspect });
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error('Failed to get 2D context'));
      }
    };
    img.onerror = (e) => {
      reject(e);
    };
    img.src = url;
  });
};

const generateQuotationPDF = (
  lead: any,
  activePkgs: any[],
  quoteNum: string,
  termsText: string,
  logoBase64?: string,
  logoAspect = 1,
  editableInclusions?: Record<string, string[]>,
  editableDeliverables?: Record<string, string[]>,
  discountValue = 0,
  additionalCharges = 0,
  quoteServices: { id: string; name: string; qty: number; price: number; isAdditional?: boolean }[] = []
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Dynamic layout configuration options (Default vs Compact to optimize page count and avoid sparse pages)
  const defaultConfig = {
    secSpacing: 6,
    rowPadding: 2.5,
    rowTextHeight: 4.2,
    termsSpacing: 3.8,
    tableSpacing: 5,
    pricingCardHeight: 25.5,
    paymentCardHeight: 29,
    boxPadding: 16,
    textPadding: 4.2,
    notesPadding: 4.2
  };

  const compactConfig = {
    secSpacing: 4,
    rowPadding: 1.5,
    rowTextHeight: 3.8,
    termsSpacing: 3.2,
    tableSpacing: 3,
    pricingCardHeight: 21,
    paymentCardHeight: 24,
    boxPadding: 12,
    textPadding: 3.6,
    notesPadding: 3.6
  };

  // Pre-split fields to calculate wrap height accurately
  const wrapCustName = doc.splitTextToSize(lead.customer_name || 'N/A', 50);
  const wrapEmail = doc.splitTextToSize(lead.email || 'Not Provided', 50);
  const displayEventType = lead.event_type === 'Other' ? (lead.custom_event_name || lead.custom_event_type || 'Other') : (lead.event_type || 'N/A');
  const wrapEventType = doc.splitTextToSize(displayEventType, 50);
  const wrapLocation = doc.splitTextToSize(lead.event_location || 'N/A', 50);

  // Resolve dynamic services
  let services = [...quoteServices];
  if (!services || services.length === 0) {
    const baseSum = activePkgs.reduce((sum, p) => sum + Number(p.package_cost || p.price || 0), 0);
    const defaultItems = [
      '2 Photographers',
      '1 Cinematographer',
      'Drone Coverage',
      'LED Wall',
      'Album (40 Sheets)',
      'Teaser Video',
      'Highlight Video',
      'Full Event Coverage'
    ];
    const defaultPrices = [20000, 15000, 10000, 10050, 8000, 7000, 5000, 5000];
    const sumDefault = defaultPrices.reduce((a, b) => a + b, 0);
    const ratio = baseSum ? (baseSum / sumDefault) : 1;

    defaultItems.forEach((name, idx) => {
      services.push({
        id: `fallback_base_${idx}`,
        name,
        qty: 1,
        price: Math.round((defaultPrices[idx] || 5000) * ratio),
        isAdditional: false
      });
    });

    if (additionalCharges > 0) {
      services.push({
        id: 'fallback_addl',
        name: 'Additional Custom Services',
        qty: 1,
        price: additionalCharges,
        isAdditional: true
      });
    }
  }

  const baseServices = services.filter(s => !s.isAdditional);
  const additionalServices = services.filter(s => s.isAdditional);

  // Helper formatting and normalization routines for cleaning characters & detecting duplicate specifications
  const normalizeForComparison = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanText = (text: string) => {
    if (!text) return '';
    let cleaned = text
      .replace(/þÿ/g, '')
      .replace(/ÿþ/g, '')
      .replace(/\uFEFF/g, '')
      .replace(/\uFFFE/g, '');
    cleaned = cleaned.replace(/^[\s•\-\*\u2022\u0095\x95\x96\u2013\u2014\s]+/g, '');
    cleaned = cleaned.replace(/[₹\u20B9\u20b9]/g, 'Rs.');
    return cleaned.trim();
  };

  // Prep Deliverables
  const allInclusions: { package: string; item: string }[] = [];
  const allDeliverables: { package: string; item: string }[] = [];

  activePkgs.forEach((pkg) => {
    const pkgId = pkg.package_id || pkg.id || 'default';
    const pkgName = pkg.package_name || pkg.name || 'Base Package';

    if (editableInclusions && editableInclusions[pkgId] && editableInclusions[pkgId].length > 0) {
      editableInclusions[pkgId].forEach((inc) => {
        allInclusions.push({ package: pkgName, item: inc });
      });
    } else if (pkg.inclusions) {
      const incList = typeof pkg.inclusions === 'string'
        ? pkg.inclusions.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
      incList.forEach((inc: string) => {
        allInclusions.push({ package: pkgName, item: inc });
      });
    }

    if (editableDeliverables && editableDeliverables[pkgId] && editableDeliverables[pkgId].length > 0) {
      editableDeliverables[pkgId].forEach((del) => {
        allDeliverables.push({ package: pkgName, item: del });
      });
    } else if (pkg.deliverables) {
      const delList = typeof pkg.deliverables === 'string'
        ? pkg.deliverables.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(pkg.deliverables) ? pkg.deliverables : [];
      delList.forEach((del: string) => {
        allDeliverables.push({ package: pkgName, item: del });
      });
    }
  });

  const combinedList = [...allInclusions, ...allDeliverables];
  
  // Deduplicate: Compare deliverables listed in second section with those in Chosen Package Specifications (baseServices)
  const cleanedBaseServicesNames = baseServices.map(s => normalizeForComparison(cleanText(s.name)));

  const filteredCombinedList = combinedList
    .map(item => ({ package: item.package, item: cleanText(item.item) }))
    .filter(item => {
      if (!item.item) return false;
      const normItem = normalizeForComparison(item.item);
      return !cleanedBaseServicesNames.includes(normItem);
    });

  const custRemarks = lead.remarks_raw || lead.remarks || '';
  const teamRemarks = lead.notes || ''; 

  const defaultTerms = [
    'Payments are non-refundable.',
    'Crew food arrangements from client side.',
    '50% advance and remaining 50% before collecting the raw data.',
    'If the duration extends, Rs. 3,000 per service per hour additional charges are applicable.',
    'We expect 90% of the payment once the event is completed and the remaining 10% before the final deliverables are ready.',
    'Pendrive and Hard Disk are not included.',
    'Edited data will be shared via Google Drive link.'
  ];

  const termsToRender = termsText.split('\n').map(t => t.trim()).filter(Boolean).length > 0
    ? termsText.split('\n').map(t => t.trim()).filter(Boolean)
    : defaultTerms;

  // Layout simulation routine
  const simulate = (cfg: typeof defaultConfig) => {
    let simY = 49;
    let simPageCount = 1;

    let simLeftY = 0;
    simLeftY += (wrapCustName.length * cfg.textPadding);
    simLeftY += cfg.textPadding;
    simLeftY += (wrapEmail.length * cfg.textPadding);
    simLeftY += cfg.textPadding;

    let simRightY = 0;
    simRightY += (wrapEventType.length * cfg.textPadding);
    simRightY += cfg.textPadding;
    simRightY += (wrapLocation.length * cfg.textPadding);
    simRightY += cfg.textPadding;

    const simBoxHeight = Math.max(simLeftY, simRightY) + cfg.boxPadding;
    simY += simBoxHeight + cfg.secSpacing;

    const getTableSimHeight = (items: any[]) => {
      let h = 4 + 7.5; 
      items.forEach((item) => {
        const cleanedName = cleanText(item.name || '');
        const wrappedName = doc.splitTextToSize(cleanedName, 166);
        h += Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);
      });
      return h;
    };

    if (baseServices.length > 0) {
      const tableH = getTableSimHeight(baseServices);
      if (simY + tableH > 250 && tableH <= (250 - 52)) {
        simY = 52;
        simPageCount++;
      } else {
        let currentTableY = simY + 4 + 7.5;
        baseServices.forEach((item) => {
          const cleanedName = cleanText(item.name || '');
          const wrappedName = doc.splitTextToSize(cleanedName, 166);
          const rowH = Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);
          if (currentTableY + rowH > 250) {
            currentTableY = 52 + 7.5;
            simPageCount++;
          }
          currentTableY += rowH;
        });
        simY = currentTableY;
      }
      simY += cfg.tableSpacing;
    }

    if (additionalServices.length > 0) {
      const tableH = getTableSimHeight(additionalServices);
      if (simY + tableH > 250 && tableH <= (250 - 52)) {
        simY = 52;
        simPageCount++;
      } else {
        let currentTableY = simY + 4 + 7.5;
        additionalServices.forEach((item) => {
          const cleanedName = cleanText(item.name || '');
          const wrappedName = doc.splitTextToSize(cleanedName, 166);
          const rowH = Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);
          if (currentTableY + rowH > 250) {
            currentTableY = 52 + 7.5;
            simPageCount++;
          }
          currentTableY += rowH;
        });
        simY = currentTableY;
      }
      simY += cfg.tableSpacing;
    }

    if (filteredCombinedList.length > 0) {
      let tableH = 4 + 7.5;
      filteredCombinedList.forEach((item) => {
        const wrappedPkg = doc.splitTextToSize(item.package || '', 45);
        const wrappedDetail = doc.splitTextToSize(item.item || '', 114);
        tableH += Math.max(7.5, Math.max(wrappedPkg.length, wrappedDetail.length) * cfg.rowTextHeight + cfg.rowPadding);
      });

      if (simY + tableH > 250 && tableH <= (250 - 52)) {
        simY = 52;
        simPageCount++;
      } else {
        let currentTableY = simY + 4 + 7.5;
        filteredCombinedList.forEach((item) => {
          const wrappedPkg = doc.splitTextToSize(item.package || '', 45);
          const wrappedDetail = doc.splitTextToSize(item.item || '', 114);
          const rowH = Math.max(7.5, Math.max(wrappedPkg.length, wrappedDetail.length) * cfg.rowTextHeight + cfg.rowPadding);
          if (currentTableY + rowH > 250) {
            currentTableY = 52 + 7.5;
            simPageCount++;
          }
          currentTableY += rowH;
        });
        simY = currentTableY;
      }
      simY += cfg.tableSpacing;
    }

    const pricingH = 4.5 + cfg.pricingCardHeight;
    if (simY + pricingH > 250) {
      simY = 52;
      simPageCount++;
    }
    simY += pricingH + cfg.secSpacing;

    const paymentH = 4.5 + cfg.paymentCardHeight;
    if (simY + paymentH > 250) {
      simY = 52;
      simPageCount++;
    }
    simY += paymentH + cfg.secSpacing;

    if (custRemarks || teamRemarks) {
      let simBoxH = 4;
      if (custRemarks) {
        const wrappedCustSim = doc.splitTextToSize(custRemarks, 170);
        simBoxH += 4.5 + (wrappedCustSim.length * cfg.notesPadding);
      }
      if (teamRemarks) {
        const wrappedTeamSim = doc.splitTextToSize(teamRemarks, 170);
        simBoxH += 4.5 + (wrappedTeamSim.length * cfg.notesPadding) + (custRemarks ? 4 : 0);
      }
      simBoxH += 2;

      const remarksH = 4.5 + simBoxH;
      if (simY + remarksH > 250) {
        simY = 52;
        simPageCount++;
      }
      simY += remarksH + cfg.secSpacing;
    }

    // 8. TERMS & CONDITIONS (Boxed)
    if (simY + 4.5 > 250) {
      simY = 52;
      simPageCount++;
    }
    simY += 4.5; // heading

    let simTermsIndex = 0;
    while (simTermsIndex < termsToRender.length) {
      let tempY = simY + 4; // top padding of box
      let collectedOnPage = 0;

      while (simTermsIndex < termsToRender.length) {
        const term = termsToRender[simTermsIndex];
        const cleanTerm = term.replace(/^\d+[\.\s\-)]+\s*/, '').replace(/[₹\u20B9\u20b9]/g, 'Rs.').replace(/\s+/g, ' ').trim();
        const wrapped = doc.splitTextToSize(cleanTerm, 163);
        const termH = (wrapped.length * cfg.termsSpacing) + 3; // spacing between terms

        if (tempY + termH > 248) {
          if (collectedOnPage === 0) {
            // Force break page
            simY = 52;
            simPageCount++;
            tempY = simY + 4;
            continue;
          }
          break; // Stop adding terms on this page, box will end here
        }
        collectedOnPage++;
        tempY += termH;
        simTermsIndex++;
      }

      if (collectedOnPage > 0) {
        const boxH = tempY - simY + 2; // including bottom padding
        simY = simY + boxH + 4; // ending of this box plus some margin
      }
    }

    // 9. PHOTOCREW PICTURES FOOTER (Always Last, at footerY = 255)
    if (simY > 250) {
      simY = 52;
      simPageCount++;
    }
    simY = 275;

    return { pageCount: simPageCount, lastPageY: simY };
  };

  // Run simulations to select the most appropriate page-budget configuration
  const defaultRes = simulate(defaultConfig);
  let cfg = defaultConfig;

  if (defaultRes.pageCount > 1) {
    const compactRes = simulate(compactConfig);
    if (compactRes.pageCount < defaultRes.pageCount) {
      cfg = compactConfig;
    } else if (compactRes.pageCount === defaultRes.pageCount && compactRes.lastPageY < defaultRes.lastPageY) {
      if (defaultRes.pageCount === 2 && defaultRes.lastPageY < 80) {
        cfg = compactConfig;
      }
    }
  }

  // Header drawing function
  const drawPageHeader = (pageDoc: typeof doc) => {
    // Premium Dark Carbon Header Bar
    pageDoc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
    pageDoc.rect(0, 0, 210, 42, 'F'); 

    // Gold Accent Line separating header from content
    pageDoc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    pageDoc.rect(0, 41, 210, 1.2, 'F');

    let logoY = 6;
    let logoW = 18;
    let logoH = 18;
    let hasLogo = false;
    
    if (logoBase64 && logoBase64.startsWith('data:image')) {
      const maxLogoW = 24;
      const maxLogoH = 18;
      logoW = maxLogoH * logoAspect;
      logoH = maxLogoH;
      if (logoW > maxLogoW) {
        logoW = maxLogoW;
        logoH = maxLogoW / logoAspect;
      }
      logoY = (30 - logoH) / 2;
      try {
        pageDoc.addImage(logoBase64, 'PNG', 15, logoY, logoW, logoH);
        hasLogo = true;
      } catch (e) {
        console.warn('Failed to add logo image to PDF:', e);
      }
    }

    if (!hasLogo) {
      pageDoc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
      pageDoc.setLineWidth(0.6);
      pageDoc.setFillColor(18, 18, 22);
      pageDoc.circle(24, logoY + 9, 9, 'FD');
      pageDoc.setFont('helvetica', 'bold');
      pageDoc.setFontSize(11);
      pageDoc.setTextColor(255, 255, 255);
      pageDoc.text('P', 22.2, logoY + 12.2);
      logoW = 18;
      logoY = 8;
    }

    const brandingX = 15 + logoW + 5;

    // Left block: Company Branding & Location Info
    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(13.5);
    pageDoc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    pageDoc.text('PHOTOCREW PICTURES', brandingX, logoY + 3);

    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7);
    pageDoc.setTextColor(185, 185, 185);
    pageDoc.text('PREMIUM PHOTOGRAPHY STUDIO & VISUAL PRODUCTION', brandingX, logoY + 7.5);
    
    pageDoc.setFontSize(7);
    pageDoc.setTextColor(150, 150, 150);
    pageDoc.text('No. 45, 1st Floor, 80 Feet Road, VijayNagar, Bangalore - 560040', brandingX, logoY + 12);
    pageDoc.text('GSTIN: 29AAFCP5894N1ZN (Registered Karnataka)', brandingX, logoY + 16.5);

    // Right block: Studio Contact Info
    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(230, 230, 230);
    pageDoc.text('www.photocrewpictures.com', 195, logoY + 4, { align: 'right' });
    pageDoc.text('info@photocrewpictures.com', 195, logoY + 8.5, { align: 'right' });
    pageDoc.text('+91 9060144016', 195, logoY + 13, { align: 'right' });

    // Header Meta Row: Quote Number, Quote Date, and Validity Date
    pageDoc.setFillColor(28, 28, 35);
    pageDoc.rect(15, 30, 180, 7.5, 'F');
    
    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(8);
    pageDoc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    pageDoc.text('QUOTATION DOCUMENT', 19, 35);

    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(240, 240, 240);
    pageDoc.text(`No: ${quoteNum}`, 90, 35);
    pageDoc.text(`Date: ${formatDate(lead.quotation_date || new Date().toISOString().split('T')[0])}`, 130, 35);
    pageDoc.text(`Validity: 15 Days`, 168, 35);
  };

  // Footer drawing function
  const drawPageFooter = (pageDoc: typeof doc, pageNum: number, totalPages: number) => {
    let footerY = 260;
    
    if (totalPages > 1) {
      pageDoc.setFont('helvetica', 'normal');
      pageDoc.setFontSize(7);
      pageDoc.setTextColor(148, 163, 184);
      pageDoc.text(`Page ${pageNum} of ${totalPages}`, 195, footerY + 14, { align: 'right' });
    }

    pageDoc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    pageDoc.rect(0, 292, 210, 5, 'F');
  };

  const drawPhotoCrewFooter = (pageDoc: typeof doc, footerY: number) => {
    pageDoc.setDrawColor(226, 232, 240);
    pageDoc.setLineWidth(0.3);
    pageDoc.line(15, footerY, 195, footerY);

    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(8.5);
    pageDoc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    pageDoc.text('PHOTOCREW PICTURES', 15, footerY + 5);
    
    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(100, 116, 139);
    pageDoc.text('Website : https://www.photocrewpictures.com/  |  Email: info@photocrewpictures.com  |  Phone: +91 9060144016', 15, footerY + 9);

    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(8);
    pageDoc.setTextColor(goldColor[0], goldColor[1], goldColor[2]); 
    pageDoc.text('Thank You For Choosing Photocrew Pictures', 15, footerY + 14);

    pageDoc.setFont('helvetica', 'normal');
    pageDoc.setFontSize(7.5);
    pageDoc.setTextColor(100, 116, 139);
    pageDoc.text('For Photocrew Pictures', 195, footerY + 5, { align: 'right' });
    pageDoc.setFont('helvetica', 'bold');
    pageDoc.setFontSize(8);
    pageDoc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    pageDoc.text('Authorized Signatory', 195, footerY + 12, { align: 'right' });
  };

  const createNewPage = () => {
    doc.addPage();
    return 52; 
  };

  // 1. Render Customer Logistics Card
  let clientY = 49;

  let leftColYOffset = 0;
  let rightColYOffset = 0;

  leftColYOffset += (wrapCustName.length * cfg.textPadding);
  leftColYOffset += cfg.textPadding; 
  leftColYOffset += (wrapEmail.length * cfg.textPadding);
  leftColYOffset += cfg.textPadding; 

  rightColYOffset += (wrapEventType.length * cfg.textPadding);
  rightColYOffset += cfg.textPadding; 
  rightColYOffset += (wrapLocation.length * cfg.textPadding);
  rightColYOffset += cfg.textPadding; 

  const boxHeight = Math.max(leftColYOffset, rightColYOffset) + cfg.boxPadding;

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
  const quoteDateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  doc.setFillColor(bgLightGrid[0], bgLightGrid[1], bgLightGrid[2]);
  doc.roundedRect(15, clientY, 180, boxHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(15, clientY, 180, boxHeight, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('CUSTOMER DETAILS', 20, clientY + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('EVENT LOGISTICS', 110, clientY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  let curLeftY = clientY + 11.5;
  const leftLabels = [
    { label: 'Customer Name', val: wrapCustName, isWrapped: true },
    { label: 'Mobile Number', val: lead.mobile || 'N/A' },
    { label: 'Email Address', val: wrapEmail, isWrapped: true },
    { label: 'Quotation No',  val: quoteNum }
  ];

  leftLabels.forEach((item) => {
    doc.text(item.label, 20, curLeftY);
    doc.text(':', 41, curLeftY);
    if (item.isWrapped && Array.isArray(item.val)) {
      item.val.forEach((line: string, i: number) => {
        doc.text(line, 43, curLeftY + (i * cfg.textPadding));
      });
      curLeftY += (item.val.length * cfg.textPadding);
    } else {
      doc.text(String(item.val), 43, curLeftY);
      curLeftY += cfg.textPadding;
    }
  });

  let curRightY = clientY + 11.5;
  const rightLabels = [
    { label: 'Event Type',     val: wrapEventType, isWrapped: true },
    { label: 'Event Date',     val: formattedEvDate },
    { label: 'Event Location', val: wrapLocation, isWrapped: true },
    { label: 'Quotation Date', val: quoteDateStr }
  ];

  rightLabels.forEach((item) => {
    doc.text(item.label, 110, curRightY);
    doc.text(':', 131, curRightY);
    if (item.isWrapped && Array.isArray(item.val)) {
      item.val.forEach((line: string, i: number) => {
        doc.text(line, 133, curRightY + (i * cfg.textPadding));
      });
      curRightY += (item.val.length * cfg.textPadding);
    } else {
      doc.text(String(item.val), 133, curRightY);
      curRightY += cfg.textPadding;
    }
  });

  let currentY = clientY + boxHeight + cfg.secSpacing;

  // Helper routine to render tables with autowrapping, dynamic heights, and smart page breaks
  const drawTable = (title: string, items: { id: string; name: string; qty: number; price: number; isAdditional?: boolean }[]) => {
    let tableH = 4 + 7.5; 
    items.forEach((item) => {
      const cleanedItemName = cleanText(item.name || '');
      const wrappedName = doc.splitTextToSize(cleanedItemName, 166);
      tableH += Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);
    });

    if (currentY + tableH > 250 && tableH <= (250 - 52)) {
      currentY = createNewPage();
    }

    if (currentY + 4 > 250) {
      currentY = createNewPage();
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(title, 15, currentY);
    currentY += 4;

    if (currentY + 7.5 > 250) {
      currentY = createNewPage();
    }
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(15, currentY, 180, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('SERVICE / DELIVERABLES', 19, currentY + 4.8);

    currentY += 7.5;

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.2);

    if (items.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No specified deliverables or customized service items.', 19, currentY + 5);
      doc.line(15, currentY, 15, currentY + 8);
      doc.line(195, currentY, 195, currentY + 8);
      doc.line(15, currentY + 8, 195, currentY + 8);
      currentY += 8;
      return;
    }

    items.forEach((item, index) => {
      const cleanedItemName = cleanText(item.name || '');
      const wrappedName = doc.splitTextToSize(cleanedItemName, 166);
      const rowHeight = Math.max(7.5, wrappedName.length * cfg.rowTextHeight + cfg.rowPadding);

      if (currentY + rowHeight > 250) {
        doc.line(15, currentY, 195, currentY);
        currentY = createNewPage();

        doc.setFillColor(30, 41, 59);
        doc.rect(15, currentY, 180, 7.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('SERVICE / DELIVERABLES (CONTINUED)', 19, currentY + 4.8);
        currentY += 7.5;
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      doc.line(15, currentY, 15, currentY + rowHeight);
      doc.line(195, currentY, 195, currentY + rowHeight);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      // Draw a clean bullet point for the first line of the item
      doc.setFillColor(51, 65, 85);
      doc.circle(20, currentY + 4.3 - 0.9, 0.6, 'F');

      wrappedName.forEach((line: string, i: number) => {
        doc.text(line, 23, currentY + 4.3 + (i * cfg.rowTextHeight));
      });

      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
      currentY += rowHeight;
    });

    currentY += cfg.tableSpacing; 
  };

  const drawDeliverablesTable = (title: string, list: { package: string; item: string }[]) => {
    if (list.length === 0) return;

    let tableH = 4 + 7.5; 
    list.forEach((item) => {
      const wrappedPkg = doc.splitTextToSize(item.package || '', 45);
      const cleanedDetailName = cleanText(item.item || '');
      const wrappedDetail = doc.splitTextToSize(cleanedDetailName, 114);
      tableH += Math.max(7.5, Math.max(wrappedPkg.length, wrappedDetail.length) * cfg.rowTextHeight + cfg.rowPadding);
    });

    if (currentY + tableH > 250 && tableH <= (250 - 52)) {
      currentY = createNewPage();
    }

    if (currentY + 4 > 250) {
      currentY = createNewPage();
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(title, 15, currentY);
    currentY += 4;

    if (currentY + 7.5 > 250) {
      currentY = createNewPage();
    }
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(15, currentY, 180, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('PACKAGE / CATEGORY', 19, currentY + 4.8);
    doc.text('INCLUSION / DELIVERABLE DETAIL', 69, currentY + 4.8);

    currentY += 7.5;

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.2);

    list.forEach((item, index) => {
      const wrappedPkg = doc.splitTextToSize(item.package || '', 45);
      const cleanedDetailName = cleanText(item.item || '');
      const wrappedDetail = doc.splitTextToSize(cleanedDetailName, 114);
      const rowHeight = Math.max(7.5, Math.max(wrappedPkg.length, wrappedDetail.length) * cfg.rowTextHeight + cfg.rowPadding);

      if (currentY + rowHeight > 250) {
        doc.line(15, currentY, 195, currentY);
        currentY = createNewPage();

        doc.setFillColor(30, 41, 59);
        doc.rect(15, currentY, 180, 7.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('PACKAGE / CATEGORY (CONTINUED)', 19, currentY + 4.8);
        doc.text('INCLUSION / DELIVERABLE DETAIL', 69, currentY + 4.8);
        currentY += 7.5;
      }

      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      doc.line(15, currentY, 15, currentY + rowHeight);
      doc.line(195, currentY, 195, currentY + rowHeight);
      doc.line(65, currentY, 65, currentY + rowHeight);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);

      wrappedPkg.forEach((line: string, i: number) => {
        doc.text(line, 19, currentY + 4.3 + (i * cfg.rowTextHeight));
      });

      // Draw a clean bullet point for the first line of the detail
      doc.setFillColor(51, 65, 85);
      doc.circle(70, currentY + 4.3 - 0.9, 0.6, 'F');

      wrappedDetail.forEach((line: string, i: number) => {
        doc.text(line, 73, currentY + 4.3 + (i * cfg.rowTextHeight));
      });

      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
      currentY += rowHeight;
    });

    currentY += cfg.tableSpacing; 
  };

  // 2. Chosen base inclusions table
  if (baseServices.length > 0) {
    drawTable('CHOSEN PACKAGE SPECIFICATIONS (BASE INCLUSIONS)', baseServices);
  }

  // 3. Additional services table
  if (additionalServices.length > 0) {
    drawTable('ADDITIONAL SPECIFICATIONS & SERVICE ADD-ONS', additionalServices);
  }

  // 4. Inclusions & Deliverables table
  if (filteredCombinedList.length > 0) {
    drawDeliverablesTable('PACKAGE INCLUSIONS & DELIVERABLES DETAILED LIST', filteredCombinedList);
  }

  // 5. PRICING SUMMARY CARD
  const pricingCardTotalH = 4.5 + cfg.pricingCardHeight;
  if (currentY + pricingCardTotalH > 250) {
    currentY = createNewPage();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('PRICING SUMMARY & ESTIMATES', 15, currentY);
  currentY += 4.5;

  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, 180, cfg.pricingCardHeight, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(15, currentY, 180, cfg.pricingCardHeight, 'D');

  const pricingRowH = cfg.pricingCardHeight / 4;
  doc.line(15, currentY + pricingRowH, 195, currentY + pricingRowH);
  doc.line(15, currentY + (pricingRowH * 2), 195, currentY + (pricingRowH * 2));
  doc.line(15, currentY + (pricingRowH * 3), 195, currentY + (pricingRowH * 3));
  doc.line(115, currentY, 115, currentY + cfg.pricingCardHeight);

  const baseSumVal = baseServices.reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0);
  const addlSumVal = additionalServices.reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0);
  const finalAmountSum = Math.max(0, baseSumVal + addlSumVal - discountValue);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  
  doc.text('Package Base Cost', 19, currentY + pricingRowH - 2);
  doc.text('Additional Services & Add-ons', 19, currentY + (pricingRowH * 2) - 2);
  doc.text('Quotation Discount (Applied)', 19, currentY + (pricingRowH * 3) - 2);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('FINAL ESTIMATED COMMERCIAL AMOUNT', 19, currentY + (pricingRowH * 4) - 2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(baseSumVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 191, currentY + pricingRowH - 2, { align: 'right' });
  doc.text(addlSumVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 191, currentY + (pricingRowH * 2) - 2, { align: 'right' });
  doc.text('- ' + discountValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 191, currentY + (pricingRowH * 3) - 2, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text(finalAmountSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 191, currentY + (pricingRowH * 4) - 2, { align: 'right' });

  currentY += cfg.pricingCardHeight + cfg.secSpacing;

  // 6. PAYMENT DETAILS CARD
  const paymentCardTotalH = 4.5 + cfg.paymentCardHeight;
  if (currentY + paymentCardTotalH > 250) {
    currentY = createNewPage();
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('PAYMENT DETAILS', 15, currentY);
  currentY += 4.5;
  
  doc.setFillColor(bgLightGrid[0], bgLightGrid[1], bgLightGrid[2]);
  doc.roundedRect(15, currentY, 180, cfg.paymentCardHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.roundedRect(15, currentY, 180, cfg.paymentCardHeight, 1.5, 1.5, 'D');

  const col1Details = [
    { label: 'Account Name', val: 'PHOTOCREW PICTURES' },
    { label: 'Bank Name',    val: 'HDFC BANK' },
    { label: 'Account No.',  val: '50200103134840' }
  ];

  const col2Details = [
    { label: 'IFSC Code',    val: 'HDFC0000312' },
    { label: 'Branch',       val: 'Vijayanagar, Bangalore' }
  ];

  // Draw Column 1
  col1Details.forEach((item, idx) => {
    const startOffset = cfg.paymentCardHeight === 29 ? 6.5 : 5.5;
    const rowSpacing = cfg.paymentCardHeight === 29 ? 6.5 : 5.5;
    const itemY = currentY + startOffset + (idx * rowSpacing);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(item.label, 20, itemY);
    doc.text(':', 45, itemY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.val, 48, itemY);
  });

  // Draw Column 2
  col2Details.forEach((item, idx) => {
    const startOffset = cfg.paymentCardHeight === 29 ? 6.5 : 5.5;
    const rowSpacing = cfg.paymentCardHeight === 29 ? 6.5 : 5.5;
    const itemY = currentY + startOffset + (idx * rowSpacing);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(item.label, 110, itemY);
    doc.text(':', 130, itemY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.val, 133, itemY);
  });
  
  currentY += cfg.paymentCardHeight + cfg.secSpacing;

  // 8. TERMS AND CONDITIONS
  if (currentY + 4.5 > 250) {
    currentY = createNewPage();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('TERMS & CONDITIONS', 15, currentY);
  currentY += 4.5;

  let termsIndex = 0;
  while (termsIndex < termsToRender.length) {
    let boxStartY = currentY;
    let tempY = currentY + 4; // top padding of box
    let pageTerms = [];

    while (termsIndex < termsToRender.length) {
      const term = termsToRender[termsIndex];
      const cleanTerm = term.replace(/^\d+[\.\s\-)]+\s*/, '').replace(/[₹\u20B9\u20b9]/g, 'Rs.').replace(/\s+/g, ' ').trim();
      const prefix = `${termsIndex + 1}. `;
      const wrapped = doc.splitTextToSize(cleanTerm, 163); // fits beautifully inside 180mm box with margins and padding
      const termHeight = (wrapped.length * cfg.termsSpacing) + 3; // spacing between terms

      if (tempY + termHeight > 248) {
        if (pageTerms.length === 0) {
          // Force break page if not even one term fits
          currentY = createNewPage();
          boxStartY = currentY;
          tempY = currentY + 4;
          continue;
        }
        break; // Stop adding terms to this page, box will end here
      }
      pageTerms.push({ prefix, wrapped, termHeight });
      tempY += termHeight;
      termsIndex++;
    }

    if (pageTerms.length > 0) {
      const boxHeight = tempY - boxStartY + 2; // including bottom padding of box
      
      // Draw a dedicated bordered content box for the terms on this page
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240); // Light gray border
      doc.setLineWidth(0.25);
      doc.roundedRect(15, boxStartY, 180, boxHeight, 1.5, 1.5, 'FD'); // Rounded corners, filled with white, and bordered

      let textOffset = boxStartY + 5; // Start with top padding
      pageTerms.forEach((pt) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        doc.text(pt.prefix, 23, textOffset, { align: 'right' }); // Right-aligned prefix for vertical alignment

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        pt.wrapped.forEach((line: string, lineIdx: number) => {
          doc.text(line, 25, textOffset + (lineIdx * cfg.termsSpacing)); // Left-aligned wrapped text
        });
        textOffset += (pt.wrapped.length * cfg.termsSpacing) + 3; // Add spacing between terms
      });

      currentY = boxStartY + boxHeight + 4; // Spacing after the box
    }
  }

  // 9. PHOTOCREW PICTURES FOOTER (Always Last)
  // Check if we have enough space for the footer on the current final page.
  // If not, we create a new page for it.
  if (currentY > 250) {
    currentY = createNewPage();
  }

  // Draw the one-time brand company footer on the final page
  const finalPageNum = (doc as any).internal.getNumberOfPages();
  doc.setPage(finalPageNum);
  drawPhotoCrewFooter(doc, 255);

  // Apply Brand Headers and Page Number Footers to ALL pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i === 1) {
      drawPageHeader(doc);
    }
    drawPageFooter(doc, i, totalPages);
  }

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

export const LEAD_SOURCES = [
  'Instagram Marketing',
  'Facebook Leads',
  'Google Ads / Search',
  'Website Inquiry',
  'WhatsApp / Direct',
  'Reference / Referral',
  'YouTube Channel',
  'Walk In Enquiry',
  'JustDial / Third Party',
  'Past Customer Repeat',
  'Other'
];

interface SalesModuleProps {
  activeSubTab?: 'list' | 'create' | 'profiles' | 'packages' | 'calendar';
  setActiveSubTab?: (tab: 'list' | 'create' | 'profiles' | 'packages' | 'calendar') => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({ activeSubTab: externalActiveTab, setActiveSubTab: externalSetActiveTab }) => {
  const { 
    currentUser,
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
    updateLead,
    saveLeadPackages,
    unlockedRecords,
    unlockRecord,
    lockRecord,
    isRecordLocked,
    isDepartmentAllowedToEdit,
    deleteLead,
    deleteOrder,
    statusHistory,
    getLeadCurrentStatus,
    getLeadCurrentStage
  } = useRole();

  const [logoBase64, setLogoBase64] = useState<string>('');
  const [logoAspectRatio, setLogoAspectRatio] = useState<number>(1);

  React.useEffect(() => {
    const preloadLogo = async () => {
      try {
        const logoUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co/storage/v1/object/public/img/logo.png';
        const result = await getLogoBase64FromUrl(logoUrl);
        setLogoBase64(result.base64);
        setLogoAspectRatio(result.aspect);
      } catch (e) {
        console.warn('Failed to pre-load logo image:', e);
      }
    };
    preloadLogo();
  }, []);

  // Role permissions gate
  const canEdit = (currentRole === 'Sales Team' || currentRole === 'Business Owner') && 
                  isDepartmentAllowedToEdit(currentRole, 'New Lead');

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
        getLeadCurrentStatus(l),
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
        getLeadCurrentStatus(l),
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
          <td>${getLeadCurrentStatus(l)}</td>
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
    category: 'Weddings',
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
  const [dbCategoryError, setDbCategoryError] = useState<string | null>(null);

  React.useEffect(() => {
    const checkCategoryColumn = async () => {
      if (!supabaseClient) return;
      try {
        const { error } = await supabaseClient.from('packages').select('category').limit(0);
        if (error && (error.code === '42703' || error.message?.toLowerCase().includes('column') || error.message?.toLowerCase().includes('does not exist'))) {
          setDbCategoryError(
            `❌ Database Schema Alert: The 'category' column is missing from the 'packages' table in Supabase. Although the app is safely resolving categories using automated description serialization, categories are not stored as a dedicated column at the database level.`
          );
        }
      } catch (e) {
        console.warn('Failed to check category column:', e);
      }
    };
    checkCategoryColumn();
  }, [packages]);

  // Group active packages directly loaded from Supabase!
  const categoriesList = React.useMemo(() => {
    const dbCats = Array.from(new Set((packages || []).map((p) => p.category))).filter(Boolean) as string[];
    const normalizedDbCats = dbCats.map(normalizeCategory);
    const normalizedPkgCats = PACKAGE_CATEGORIES.map(normalizeCategory);
    const customCats = normalizedDbCats.filter(c => !normalizedPkgCats.includes(c)).sort();
    return Array.from(new Set([...normalizedPkgCats, ...customCats]));
  }, [packages]);

  const PACKAGES_LIST = categoriesList.map((cat) => ({
    categoryName: cat,
    items: (packages || [])
      .filter((p) => normalizeCategory(p.category) === cat && p.status === 'Active')
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
  const [crmWizardStep, setCrmWizardStep] = useState<number>(1);
  const [wizardLeadData, setWizardLeadData] = useState({
    customer_name: '',
    mobile: '',
    whatsapp_number: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    client_residence_address: '',
    desired_event_shoot_type: '',
    // Step 2
    event_type: '',
    custom_event_name: '',
    event_date: '',
    event_time: '',
    reporting_time: '',
    event_location: '',
    lead_source: '',
    shoot_type: '',
    // Step 3
    selected_package_id: '',
    package_cost: 0,
    deliverables: '',
    notes: '',
    // Step 4
    budget: 0,
    final_quoted_amount: 0,
    remarks: '',
    next_follow_up_date: '',
    // Step 5
    status: '' as CurrentStage,
    // Order Confirmed Rule fields
    confirmed_event_date: '',
    confirmed_event_time: '',
    final_amount: 0,
    advance_received: 0,
    package_price: 0,
    deliverables_description: '',
    notes_special_customizations: '',
    quotation_discount: 0,
    additional_services_cost: 0,
    total_pax: 0,
    reference_source: '',
    lead_value: 0,
    lead_score: 0,
    booking_status: 'Pending',
  });

  const [crmToast, setCrmToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setCrmToast({ message, type });
    setTimeout(() => setCrmToast(null), 3000);
  };

  const logStatusUpdateError = (params: {
    leadId: string | null;
    orderId: string | null;
    oldStatus: string | null;
    newStatus: string | null;
    updatePayload: any;
    insertPayload: any;
    dbResponse: any;
    fullError: any;
  }) => {
    console.group("%c CRM STATUS UPDATE ERROR LOG ", "background: #f43f5e; color: white; font-weight: bold; padding: 4px;");
    console.log("Lead ID:", params.leadId);
    console.log("Order ID:", params.orderId);
    console.log("Old Status:", params.oldStatus);
    console.log("New Status:", params.newStatus);
    console.log("Supabase UPDATE payload:", params.updatePayload);
    console.log("Supabase INSERT payload:", params.insertPayload);
    console.log("Database response:", params.dbResponse);
    console.log("Full error message:", params.fullError);
    console.groupEnd();
  };

  const parseStatusUpdateError = (errorMsg: string): { reason: string; suggestedFix: string } => {
    const msg = errorMsg.toLowerCase();
    
    let reason = errorMsg;
    let suggestedFix = "Please contact support or review the database connections and tables.";

    if (msg.includes("relation \"leads\" does not exist") || msg.includes("table name: leads\nmissing")) {
      reason = "Table 'leads' does not exist in the database schema.";
      suggestedFix = "Please ensure the 'leads' table is created in your Supabase database using the SQL editor.";
    } else if (msg.includes("relation \"lead_status_history\" does not exist") || msg.includes("relation \"public.lead_status_history\" does not exist")) {
      reason = "Table 'lead_status_history' does not exist in the database schema.";
      suggestedFix = "Create the 'lead_status_history' table in your Supabase database using: \n\nCREATE TABLE lead_status_history (\n  id SERIAL PRIMARY KEY,\n  lead_id TEXT,\n  order_id TEXT,\n  old_status TEXT,\n  new_status TEXT,\n  changed_by TEXT,\n  changed_by_role TEXT,\n  remarks TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);";
    } else if (msg.includes("column \"current_status\"") || msg.includes("column leads.current_status") || msg.includes("missing column name: current_status")) {
      reason = "Missing column \"current_status\" in table \"leads\".";
      suggestedFix = "Create the \"current_status\" column or update the database mapping using: \n\nALTER TABLE leads ADD COLUMN current_status TEXT;";
    } else if (msg.includes("column \"new_status\"") || msg.includes("column lead_status_history.new_status")) {
      reason = "Missing column \"new_status\" in table \"lead_status_history\".";
      suggestedFix = "Add the missing 'new_status' column to 'lead_status_history' table using: \n\nALTER TABLE lead_status_history ADD COLUMN new_status TEXT;";
    } else if (msg.includes("rls policy denied") || msg.includes("row-level security") || msg.includes("violates row-level security")) {
      reason = `RLS policy denied UPDATE on table "leads".`;
      suggestedFix = "Update the RLS policy to allow authenticated users to update lead records.";
    } else if (msg.includes("permission denied") || msg.includes("insufficient privilege")) {
      reason = `Permission denied by database. Details: ${errorMsg}`;
      suggestedFix = "Ensure the API client role has correct permissions (SELECT/INSERT/UPDATE) granted on the table.";
    } else if (msg.includes("not found") && msg.includes("leads")) {
      reason = `Lead ID invalid or lead record not found. Details: ${errorMsg}`;
      suggestedFix = "Verify that the Lead ID exists in the 'leads' table and has not been deleted.";
    } else if (msg.includes("lead_status_history insert failed because \"lead_id\" is null") || msg.includes("lead_id is null") || msg.includes("lead_id\" is null")) {
      reason = `"lead_status_history" insert failed because "lead_id" is NULL.`;
      suggestedFix = "Pass a valid \"lead_id\" before inserting the status history.";
    } else if (msg.includes("foreign key constraint")) {
      reason = `Foreign key constraint failed. Details: ${errorMsg}`;
      suggestedFix = "Check if the referenced records (e.g. lead_id, order_id) exist in their parent tables first.";
    } else if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      reason = `Unique constraint violation. Details: ${errorMsg}`;
      suggestedFix = "Ensure that the record ID being inserted is unique and does not already exist.";
    } else if (msg.includes("network error") || msg.includes("failed to fetch") || msg.includes("database connection failed")) {
      reason = `Network error or failed to reach the database connection.`;
      suggestedFix = "Please check your internet connection or verify if your server/Supabase instances are active.";
    } else if (msg.includes("required field") || msg.includes("null value in column")) {
      reason = `Required database field is missing. Details: ${errorMsg}`;
      suggestedFix = "Ensure all required fields are filled and not null before submitting.";
    } else {
      const tableMatch = errorMsg.match(/table "([^"]+)"|relation "([^"]+)"/);
      const colMatch = errorMsg.match(/column "([^"]+)"/);
      if (tableMatch || colMatch) {
        const tableName = tableMatch ? (tableMatch[1] || tableMatch[2]) : "unknown table";
        const colName = colMatch ? colMatch[1] : "";
        reason = `Database operation failed on table "${tableName}"` + (colName ? ` for column "${colName}".` : ".");
        suggestedFix = `Verify the schema of "${tableName}" table. If "${colName}" column is missing, add it using ALTER TABLE ${tableName} ADD COLUMN ${colName} TEXT;`;
      }
    }

    return { reason, suggestedFix };
  };

  const [statusError, setStatusError] = useState<{ title: string; reason: string; suggestedFix: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [unlockingRecordId, setUnlockingRecordId] = useState<string | null>(null);
  const [unlockReason, setUnlockReason] = useState('Data Correction');
  const [unlockCustomReason, setUnlockCustomReason] = useState('');

  const isLeadLocked = selectedLead ? isRecordLocked(selectedLead.lead_id, 'Sales') : false;

  // Repeat Customer / Reorder System states
  const [detectedCustomer, setDetectedCustomer] = useState<any>(null);
  const [showDetectionPopup, setShowDetectionPopup] = useState(false);
  const [isQuickReorderView, setIsQuickReorderView] = useState(false);
  
  // Custom states for configuring quick reorder
  const [reorderForm, setReorderForm] = useState({
    event_type: '',
    custom_event_name: '',
    custom_event_type: '',
    event_date: '',
    event_time: '12:00',
    event_location: '',
    package_name: '',
    quotation_amount: 0,
    advance_received: 0,
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

  // Screen 2 Form State (Wizard support)
  const [createForm, setCreateForm] = useState<{
    customer_name: string;
    mobile: string;
    alternate_mobile: string;
    email: string;
    lead_source: string;
    event_type: string;
    custom_event_name: string;
    shoot_type: string;
    event_date: string;
    event_time: string;
    event_location: string;
    budget: number | '';
    remarks: string;
    whatsapp_number: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    client_residence_address: string;
    desired_event_shoot_type: string;
    Select_Package_Option: string;
    total_pax: number | '';
    reference_source: string;
    lead_value: number | '';
    lead_score: number | '';
    booking_status: string;
  }>({
    customer_name: '',
    mobile: '',
    alternate_mobile: '',
    email: '',
    lead_source: '',
    event_type: '',
    custom_event_name: '',
    shoot_type: '',
    event_date: '',
    event_time: '',
    event_location: '',
    budget: '',
    remarks: '',
    whatsapp_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    client_residence_address: '',
    desired_event_shoot_type: '',
    Select_Package_Option: '',
    total_pax: '',
    reference_source: '',
    lead_value: '',
    lead_score: '',
    booking_status: '',
  });

  const [wizardStep, setWizardStep] = useState(1);
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null);

  // Package customizations
  const [pkgPrices, setPkgPrices] = useState<Record<string, number>>({});
  const [pkgDeliverables, setPkgDeliverables] = useState<Record<string, string>>({});
  const [pkgNotes, setPkgNotes] = useState<Record<string, string>>({});

  // Additional form fields for Steps 4 & 5
  const [reportingTime, setReportingTime] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [salesStatus, setSalesStatus] = useState<string>('');

  // Order Confirmed Additional mandatory fields
  const [confirmedEventDate, setConfirmedEventDate] = useState('');
  const [confirmedEventTime, setConfirmedEventTime] = useState('');
  const [finalPackageAmount, setFinalPackageAmount] = useState<number | ''>('');
  const [advanceReceived, setAdvanceReceived] = useState<number | ''>('');

  const resetForm = () => {
    setCreateForm({
      customer_name: '',
      mobile: '',
      alternate_mobile: '',
      email: '',
      lead_source: '',
      event_type: '',
      custom_event_name: '',
      shoot_type: '',
      event_date: '',
      event_time: '',
      event_location: '',
      budget: '',
      remarks: '',
      whatsapp_number: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      client_residence_address: '',
      desired_event_shoot_type: '',
      Select_Package_Option: '',
      total_pax: '',
      reference_source: '',
      lead_value: '',
      lead_score: '',
      booking_status: '',
    });
    setWizardLeadData({
      customer_name: '',
      mobile: '',
      whatsapp_number: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      client_residence_address: '',
      desired_event_shoot_type: '',
      event_type: '',
      custom_event_name: '',
      event_date: '',
      event_time: '',
      reporting_time: '',
      event_location: '',
      lead_source: '',
      shoot_type: '',
      selected_package_id: '',
      package_cost: 0,
      deliverables: '',
      notes: '',
      budget: 0,
      final_quoted_amount: 0,
      remarks: '',
      next_follow_up_date: '',
      status: '' as CurrentStage,
      confirmed_event_date: '',
      confirmed_event_time: '',
      final_amount: 0,
      advance_received: 0,
      package_price: 0,
      deliverables_description: '',
      notes_special_customizations: '',
      quotation_discount: 0,
      additional_services_cost: 0,
      total_pax: 0,
      reference_source: '',
      lead_value: 0,
      lead_score: 0,
      booking_status: 'Pending',
    });
    setOtherSource('');
    setSelectedPkgIds([]);
    setLeadDiscount('');
    setIsPkgDropdownOpen(false);
    
    // Reset wizard fields
    setWizardStep(1);
    setCrmWizardStep(1);
    setCreatedLeadId(null);
    setPkgPrices({});
    setPkgDeliverables({});
    setPkgNotes({});
    setReportingTime('');
    setInternalNotes('');
    setFollowUpDate('');
    setSalesStatus('');
    setConfirmedEventDate('');
    setConfirmedEventTime('');
    setFinalPackageAmount('');
    setAdvanceReceived('');
    setQuoteDiscount('');
    setQuoteAdditional('');
    
    setFollowUpForm({
      status: '',
      quotation_amount: '',
      advance_received: '',
      call_notes: ''
    });
    setConfirmForm({
      package_name: '',
      quotation_amount: '',
      advance_received: '',
      event_date: '',
      event_time: ''
    });
    setShowConfirmModal(false);
    setGeneratedPDFBlobUrl('');
    setActiveQuoteNum('');
    setEditableInclusions({});
    setEditableDeliverables({});
    setQuoteServices([]);
    setEditingServiceId(null);
    setNewServiceName('');
    setNewServiceQty(1);
    setNewServicePrice(0);
    setIsAddingInline(false);
    setStatusError(null);
    setUnlockingRecordId(null);
    setPkgSearchQuery('');

    // Clear cached quote services
    localStorage.removeItem('erp_quote_services_create');
  };

  // Action hook to reset state, auto-scroll and auto-focus when transitioning to 'create' tab
  React.useEffect(() => {
    if (activeTab === 'create') {
      resetForm();

      setTimeout(() => {
        const titleEl = document.getElementById('create_lead_form_heading');
        if (titleEl) {
          titleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const formEl = document.querySelector('form');
          if (formEl) {
            formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        const firstInput = document.querySelector('input[placeholder*="Enter customer name"]') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 150);
    }
  }, [activeTab]);

  // Packages creation hooks
  const [selectedPkgIds, setSelectedPkgIds] = useState<string[]>([]);
  const [leadDiscount, setLeadDiscount] = useState<number>(0);
  const [isPkgDropdownOpen, setIsPkgDropdownOpen] = useState(false);
  const [pkgSearchQuery, setPkgSearchQuery] = useState('');

  // Auto calculate and sync with createForm.budget
  const selectedPkgs = PACKAGES_LIST.flatMap(cat => cat.items).filter(item => selectedPkgIds.includes(item.id));
  
  // Package Selection Price is editable, so subtotal sums the edited prices
  const subtotal = selectedPkgs.reduce((sum, item) => sum + (pkgPrices[item.id] !== undefined ? pkgPrices[item.id] : item.cost), 0);
  const finalTotal = Math.max(0, subtotal - leadDiscount);

  // Sync package configurations on changes
  React.useEffect(() => {
    const allPkgs = PACKAGES_LIST.flatMap(cat => cat.items);
    const newPrices = { ...pkgPrices };
    const newDeliverables = { ...pkgDeliverables };
    const newNotes = { ...pkgNotes };
    let changed = false;

    selectedPkgIds.forEach(id => {
      const p = allPkgs.find(item => item.id === id);
      if (p) {
        if (newPrices[id] === undefined) {
          newPrices[id] = p.cost;
          changed = true;
        }
        if (newDeliverables[id] === undefined) {
          newDeliverables[id] = p.deliverables || 'N/A';
          changed = true;
        }
        if (newNotes[id] === undefined) {
          newNotes[id] = p.seasonal_offer !== 'None' ? `Offers: ${p.seasonal_offer}` : '';
          changed = true;
        }
      }
    });

    // Remove unselected package keys
    Object.keys(newPrices).forEach(id => {
      if (!selectedPkgIds.includes(id)) {
        delete newPrices[id];
        delete newDeliverables[id];
        delete newNotes[id];
        changed = true;
      }
    });

    if (changed) {
      setPkgPrices(newPrices);
      setPkgDeliverables(newDeliverables);
      setPkgNotes(newNotes);
    }
  }, [selectedPkgIds, PACKAGES_LIST]);

  React.useEffect(() => {
    // Only auto-override if packages are actively selected
    if (selectedPkgIds.length > 0) {
      setCreateForm(prev => ({
        ...prev,
        budget: finalTotal,
        Select_Package_Option: selectedPkgIds[0] || ''
      }));
    } else {
      setCreateForm(prev => ({
        ...prev,
        Select_Package_Option: ''
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
    package_name: '',
    quotation_amount: 0,
    advance_received: 0,
    event_date: '',
    event_time: '',
    payment_mode: 'UPI',
    notes: '',
    transaction_id: '',
  });

  // Quotation System State
  const [quotationTerms, setQuotationTerms] = useState(
    "1. Payments are non-refundable.\n" +
    "2. Crew food arrangements from client side.\n" +
    "3. 50% advance and remaining 50% before collecting the raw data.\n" +
    "4. If the duration extends, ₹3,000 per service per hour additional charges are applicable.\n" +
    "5. We expect 90% of the payment once the event is completed and the remaining 10% before the final deliverables are ready.\n" +
    "6. Pendrive and Hard Disk are not included.\n" +
    "7. Edited data will be shared via Google Drive link."
  );
  const [generatedPDFBlobUrl, setGeneratedPDFBlobUrl] = useState<string>('');
  const [activeQuoteNum, setActiveQuoteNum] = useState<string>('');

  // Customizable inclusions, deliverables, discount, and additional charges states
  const [editableInclusions, setEditableInclusions] = useState<Record<string, string[]>>({});
  const [editableDeliverables, setEditableDeliverables] = useState<Record<string, string[]>>({});
  const [quoteDiscount, setQuoteDiscount] = useState<number | ''>('');
  const [quoteAdditional, setQuoteAdditional] = useState<number | ''>('');

  const [quoteServices, setQuoteServices] = useState<{ id: string; name: string; qty: number; price: number; isAdditional?: boolean }[]>([]);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  
  // Adding service inline temp states
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceQty, setNewServiceQty] = useState(1);
  const [newServicePrice, setNewServicePrice] = useState(0);
  const [isAddingInline, setIsAddingInline] = useState(false);

  const handleAddInlineService = () => {
    if (!newServiceName.trim()) return;
    const newService = {
      id: `add_${Date.now()}`,
      name: newServiceName.trim(),
      qty: Math.max(1, newServiceQty),
      price: Math.max(0, newServicePrice),
      isAdditional: true
    };
    setQuoteServices(prev => [...prev, newService]);
    // reset states
    setNewServiceName('');
    setNewServiceQty(1);
    setNewServicePrice(0);
    setIsAddingInline(false);
  };

  const handleEditServiceItem = (id: string, updatedFields: Partial<{ name: string; qty: number; price: number }>) => {
    setQuoteServices(prev => prev.map(s => s.id === id ? { ...s, ...updatedFields } : s));
  };

  const handleRemoveServiceItem = (id: string) => {
    setQuoteServices(prev => prev.filter(s => s.id !== id));
  };

  // Keep quoteAdditional synchronized in real-time
  React.useEffect(() => {
    const additionalSum = quoteServices
      .filter(s => s.isAdditional)
      .reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0);
    setQuoteAdditional(additionalSum);
  }, [quoteServices]);

  // Synchronize/initialize services on entering Step 4
  React.useEffect(() => {
    const isStep4Active = wizardStep === 4 || crmWizardStep === 4;
    if (!isStep4Active) {
      setEditingServiceId(null);
      setIsAddingInline(false);
      return;
    }

    const activePkgs = getSelectedPkgsInfo(crmWizardStep === 4);
    const activePkgIds = activePkgs.map(lp => lp.package_id).filter(Boolean);

    // Build expected list of base deliverables from active packages directly from packages table
    const expectedBaseDeliverables: { pkgId: string; name: string }[] = [];
    activePkgs.forEach((lp) => {
      const pkgKey = lp.package_id || 'default';
      const pObj = (packages || []).find(p => p.package_id === lp.package_id);
      const incStr = pObj?.team_members || '';
      const delStr = pObj?.deliverables || '';

      const inclusionsList = incStr
        ? incStr.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : [];
      const deliverablesList = delStr
        ? delStr.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : [];

      const combined = [...inclusionsList, ...deliverablesList];
      if (combined.length === 0) {
        const defaultItems = [
          '2 Photographers',
          '1 Cinematographer',
          'Drone Coverage',
          'LED Wall',
          'Album (40 Sheets)',
          'Teaser Video',
          'Highlight Video',
          'Full Event Coverage'
        ];
        defaultItems.forEach(name => {
          expectedBaseDeliverables.push({ pkgId: pkgKey, name });
        });
      } else {
        combined.forEach(name => {
          expectedBaseDeliverables.push({ pkgId: pkgKey, name });
        });
      }
    });

    const leadId = crmWizardStep === 4 ? (selectedLead?.lead_id || 'edit') : (createdLeadId || 'create');
    const storageKey = `erp_quote_services_${leadId}`;
    const cached = localStorage.getItem(storageKey);
    let cacheIsValid = false;

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          const cachedBaseServices = parsed.filter(s => !s.isAdditional && s.id.startsWith('base_'));
          
          if (cachedBaseServices.length === expectedBaseDeliverables.length) {
            const allMatched = expectedBaseDeliverables.every((expected) => {
              return cachedBaseServices.some(s => {
                const parts = s.id.split('_');
                const pkgIdPart = parts[1];
                return pkgIdPart === expected.pkgId && s.name === expected.name;
              });
            });
            if (allMatched) {
              cacheIsValid = true;
              setQuoteServices(parsed);
              return;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse cached quote services", e);
      }
    }

    // Fallback/Rebuild: auto-initialize directly using data from packages table
    const initialServices: { id: string; name: string; qty: number; price: number; isAdditional: boolean }[] = [];
    activePkgs.forEach((lp) => {
      const pkgKey = lp.package_id || 'default';
      const pObj = (packages || []).find(p => p.package_id === lp.package_id);
      const incStr = pObj?.team_members || '';
      const delStr = pObj?.deliverables || '';

      const inclusionsList = incStr
        ? incStr.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : [];
      const deliverablesList = delStr
        ? delStr.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : [];

      const combined = [...inclusionsList, ...deliverablesList];

      if (combined.length === 0) {
        // Fallback standard photography inclusions
        const defaultItems = [
          '2 Photographers',
          '1 Cinematographer',
          'Drone Coverage',
          'LED Wall',
          'Album (40 Sheets)',
          'Teaser Video',
          'Highlight Video',
          'Full Event Coverage'
        ];
        const defaultPrices = [20000, 15000, 10000, 10050, 8000, 7000, 5000, 5000];
        const sumDefault = defaultPrices.reduce((a, b) => a + b, 0);
        const totalCost = Number(lp.package_cost || 0);
        const ratio = totalCost ? (totalCost / sumDefault) : 1;

        let distributed = 0;
        defaultItems.forEach((name, idx) => {
          let pricePerItem;
          if (idx === defaultItems.length - 1) {
            pricePerItem = totalCost - distributed;
          } else {
            pricePerItem = Math.round((defaultPrices[idx] || 5000) * ratio);
            distributed += pricePerItem;
          }
          initialServices.push({
            id: `base_${pkgKey}_${idx}`,
            name,
            qty: 1,
            price: pricePerItem,
            isAdditional: false
          });
        });
      } else {
        // Divide lp.package_cost equally among combined items
        const count = combined.length;
        const totalCost = Number(lp.package_cost || 0);
        let distributed = 0;
        combined.forEach((name, idx) => {
          let pricePerItem;
          if (idx === count - 1) {
            pricePerItem = totalCost - distributed;
          } else {
            pricePerItem = Math.round(totalCost / count);
            distributed += pricePerItem;
          }
          initialServices.push({
            id: `base_${pkgKey}_${idx}`,
            name,
            qty: 1,
            price: pricePerItem,
            isAdditional: false
          });
        });
      }
    });

    setQuoteServices(initialServices);
  }, [wizardStep, crmWizardStep, selectedLead, createdLeadId, packages, wizardLeadData.selected_package_id, selectedPkgIds]);

  // Save services to local storage whenever they change
  React.useEffect(() => {
    const isStep4Active = wizardStep === 4 || crmWizardStep === 4;
    if (!isStep4Active) return;
    const leadId = crmWizardStep === 4 ? (selectedLead?.lead_id || 'edit') : (createdLeadId || 'create');
    localStorage.setItem(`erp_quote_services_${leadId}`, JSON.stringify(quoteServices));
  }, [quoteServices, selectedLead, createdLeadId, crmWizardStep, wizardStep]);

  const dynamicBaseSum = quoteServices
    .filter(s => !s.isAdditional)
    .reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0);

  const dynamicAdditionalSum = quoteServices
    .filter(s => s.isAdditional)
    .reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0);

  const dynamicFinalAmt = Math.max(0, dynamicBaseSum - quoteDiscount + dynamicAdditionalSum);

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

  // Auto-scroll and focus transitions for Sales Popups & Forms
  React.useEffect(() => {
    if (activeTab === 'create') {
      triggerAutoScrollAndFocus('#create_lead_form', 150);
    }
  }, [wizardStep, activeTab]);

  React.useEffect(() => {
    if (selectedLead) {
      triggerAutoScrollAndFocus('#lead_details_mobile_modal', 150);
    }
  }, [crmWizardStep, selectedLead]);

  React.useEffect(() => {
    if (isAddFormOpen || editingPackage) {
      triggerAutoScrollAndFocus('#add_edit_package_modal', 150);
    }
  }, [isAddFormOpen, editingPackage]);

  React.useEffect(() => {
    if (showConfirmModal) {
      triggerAutoScrollAndFocus('#confirm_booking_modal', 150);
    }
  }, [showConfirmModal]);

  React.useEffect(() => {
    if ((wizardStep === 4 || crmWizardStep === 4) && !activeQuoteNum) {
      const randomID = Math.floor(1000 + Math.random() * 9000);
      setActiveQuoteNum(`QT-2026-${randomID}`);
    }
  }, [wizardStep, crmWizardStep, activeQuoteNum]);

  const getSelectedPkgsInfo = (isEdit: boolean) => {
    if (isEdit) {
      const finalPkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option || selectedLead?.Select_Package_Option || '';
      const primaryPkg = packages.find(p => p.package_id === finalPkgId);
      return [{
        package_name: primaryPkg?.package_name || 'Selected Package',
        package_id: finalPkgId || 'selected_pkg',
        package_cost: Number(wizardLeadData.package_cost) || Number(primaryPkg?.price) || 0,
        deliverables: wizardLeadData.deliverables || primaryPkg?.deliverables || '',
        inclusions: primaryPkg?.package_includes || '',
        team_members: primaryPkg?.team_members || '',
        seasonal_offer: primaryPkg?.seasonal_offer || '',
        terms_conditions: primaryPkg?.terms_conditions || '',
        event_type: primaryPkg?.event_type || '',
        duration: primaryPkg?.duration || '',
        category: primaryPkg?.category || ''
      }];
    } else {
      const selectedPkgs = (packages || []).filter(item => selectedPkgIds.includes(item.package_id));
      return selectedPkgs.map(p => ({
        package_name: p.package_name,
        package_id: p.package_id,
        package_cost: pkgPrices[p.package_id] !== undefined ? pkgPrices[p.package_id] : p.price,
        deliverables: pkgDeliverables[p.package_id] || p.deliverables || '',
        inclusions: p.package_includes || '',
        team_members: p.team_members || '',
        seasonal_offer: p.seasonal_offer || '',
        terms_conditions: p.terms_conditions || '',
        event_type: p.event_type || '',
        duration: p.duration || '',
        category: p.category || ''
      }));
    }
  };

  const getLeadInfoForQuote = (isEdit: boolean) => {
    if (isEdit) {
      return {
        ...selectedLead,
        customer_name: wizardLeadData.customer_name,
        mobile: wizardLeadData.mobile,
        email: wizardLeadData.email,
        event_date: wizardLeadData.event_date,
        event_location: wizardLeadData.event_location,
        event_type: wizardLeadData.event_type,
        shoot_type: wizardLeadData.shoot_type,
        budget: wizardLeadData.budget,
        whatsapp_number: wizardLeadData.whatsapp_number,
        address: wizardLeadData.address,
        city: wizardLeadData.city,
        state: wizardLeadData.state,
        pincode: wizardLeadData.pincode,
        client_residence_address: wizardLeadData.client_residence_address,
        desired_event_shoot_type: wizardLeadData.desired_event_shoot_type,
        deliverables_description: wizardLeadData.deliverables,
        notes_special_customizations: wizardLeadData.notes,
        Select_Package_Option: wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option || ''
      };
    } else {
      return {
        ...createForm,
        lead_id: createdLeadId || 'DRAFT-LEAD',
        deliverables_description: selectedPkgs.map(p => pkgDeliverables[p.id] || p.deliverables || 'N/A').join('\n'),
        notes_special_customizations: selectedPkgs.map(p => pkgNotes[p.id] || '').join('\n'),
        Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
      };
    }
  };

  const validateLeadForQuotation = (leadObj: any, activePkgs: any[]) => {
    const missing: string[] = [];
    if (!leadObj.customer_name?.trim()) missing.push('Customer Name');
    if (!leadObj.mobile?.trim()) missing.push('Mobile Number');
    if (!leadObj.event_type?.trim()) missing.push('Event Type');
    if (!leadObj.desired_event_shoot_type?.trim() && !leadObj.shoot_type?.trim()) missing.push('Desired Event Shoot Type');
    if (!leadObj.event_date?.trim()) missing.push('Event Date');
    if (!leadObj.event_location?.trim() && !leadObj.address?.trim() && !leadObj.client_residence_address?.trim()) missing.push('Event Address');
    if (activePkgs.length === 0) missing.push('At least one selected package');
    return missing;
  };

  const handleGenerateQuote = async (isEdit: boolean) => {
    setIsSaving(true);
    try {
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);

      const missingFields = validateLeadForQuotation(leadObj, activePkgs);
      if (missingFields.length > 0) {
        showToastMsg(`Quotation Incomplete! Please enter the following fields: ${missingFields.join(', ')}`, "error");
        setIsSaving(false);
        return;
      }

      const basePkgSum = dynamicBaseSum;
      const finalAmt = dynamicFinalAmt;
      const quotNum = activeQuoteNum || `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      
      if (!activeQuoteNum) {
        setActiveQuoteNum(quotNum);
      }

      const qId = 'QT-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      
      const standardQuotation = {
        quotation_id: qId,
        quotation_number: quotNum,
        lead_id: leadObj.lead_id || 'DRAFT-LEAD',
        customer_id: leadObj.customer_name || 'Customer',
        customer_name: leadObj.customer_name || 'Customer',
        order_id: '',
        package_name: activePkgs.map(p => p.package_name).join(' + '),
        package_price: basePkgSum,
        discount: quoteDiscount,
        additional_services_cost: quoteAdditional,
        final_quotation_amount: finalAmt,
        quotation_status: 'Sent',
        pdf_url: '',
        generated_date: new Date().toISOString().split('T')[0],
        whatsapp_sent_status: false,
        viewed_status: false,
        terms_conditions: quotationTerms,
        deliverables_description: leadObj.deliverables_description,
        notes_special_customizations: leadObj.notes_special_customizations,
        client_residence_address: leadObj.client_residence_address,
        city: leadObj.city,
        state: leadObj.state,
        pincode: leadObj.pincode,
        desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type
      };

      await addQuotation(standardQuotation);

      if (isEdit) {
        setWizardLeadData(prev => ({
          ...prev,
          budget: finalAmt,
          final_quoted_amount: finalAmt,
          status: 'Quotation Sent' as CurrentStage
        }));
        await updateLead(leadObj.lead_id, {
          budget: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          package_price: basePkgSum,
          deliverables_description: leadObj.deliverables_description,
          notes_special_customizations: leadObj.notes_special_customizations,
          quotation_discount: quoteDiscount,
          additional_services_cost: quoteAdditional,
          client_residence_address: leadObj.client_residence_address,
          city: leadObj.city,
          state: leadObj.state,
          pincode: leadObj.pincode,
          desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,
          remarks: getRemarksPayload(wizardLeadData.remarks, wizardLeadData.notes || '', wizardLeadData.next_follow_up_date, wizardLeadData.whatsapp_number, wizardLeadData.address, wizardLeadData.city),
          Select_Package_Option: leadObj.Select_Package_Option || ''
        });
      } else {
        setCreateForm(prev => ({
          ...prev,
          budget: finalAmt
        }));
        setSalesStatus('Quotation Sent');
        await updateLead(createdLeadId!, {
          budget: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          package_price: basePkgSum,
          deliverables_description: leadObj.deliverables_description,
          notes_special_customizations: leadObj.notes_special_customizations,
          quotation_discount: quoteDiscount,
          additional_services_cost: quoteAdditional,
          client_residence_address: leadObj.client_residence_address,
          city: leadObj.city,
          state: leadObj.state,
          pincode: leadObj.pincode,
          desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,
          remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city),
          Select_Package_Option: leadObj.Select_Package_Option || ''
        });
      }

      showToastMsg("Quotation successfully generated and saved to CRM!", "success");
    } catch (err: any) {
      console.error("Failed to generate quotation:", err);
      alert("Failed to generate quotation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewQuotePDF = async (isEdit: boolean) => {
    try {
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);

      const missingFields = validateLeadForQuotation(leadObj, activePkgs);
      if (missingFields.length > 0) {
        showToastMsg(`Quotation Incomplete! Please enter the following fields: ${missingFields.join(', ')}`, "error");
        return;
      }

      const quotNum = activeQuoteNum || `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      
      let currentLogo = logoBase64;
      let currentAspect = logoAspectRatio;
      try {
        const logoUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co/storage/v1/object/public/img/logo.png';
        const result = await getLogoBase64FromUrl(logoUrl);
        currentLogo = result.base64;
        currentAspect = result.aspect;
      } catch (e) {
        console.warn("Failed to wait-load logo for preview, using preloaded:", e);
      }

      const doc = generateQuotationPDF(
        leadObj,
        activePkgs,
        quotNum,
        quotationTerms,
        currentLogo,
        currentAspect,
        editableInclusions,
        editableDeliverables,
        quoteDiscount,
        quoteAdditional,
        quoteServices
      );
      
      const blobUrl = doc.output('bloburl');
      setGeneratedPDFBlobUrl(blobUrl);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to preview PDF.");
    }
  };

  const handleDownloadQuotePDF = async (isEdit: boolean) => {
    try {
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);

      const missingFields = validateLeadForQuotation(leadObj, activePkgs);
      if (missingFields.length > 0) {
        showToastMsg(`Quotation Incomplete! Please enter the following fields: ${missingFields.join(', ')}`, "error");
        return;
      }

      const quotNum = activeQuoteNum || `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      
      let currentLogo = logoBase64;
      let currentAspect = logoAspectRatio;
      try {
        const logoUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co/storage/v1/object/public/img/logo.png';
        const result = await getLogoBase64FromUrl(logoUrl);
        currentLogo = result.base64;
        currentAspect = result.aspect;
      } catch (e) {
        console.warn("Failed to wait-load logo for download, using preloaded:", e);
      }

      const doc = generateQuotationPDF(
        leadObj,
        activePkgs,
        quotNum,
        quotationTerms,
        currentLogo,
        currentAspect,
        editableInclusions,
        editableDeliverables,
        quoteDiscount,
        quoteAdditional,
        quoteServices
      );
      
      doc.save(`Quotation_${quotNum}.pdf`);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Failed to download PDF.");
    }
  };

  const handleSendWhatsAppQuote = (isEdit: boolean) => {
    try {
      console.log(`[handleSendWhatsAppQuote] Starting for isEdit=${isEdit}`);
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);

      const missingFields = validateLeadForQuotation(leadObj, activePkgs);
      if (missingFields.length > 0) {
        console.warn(`[handleSendWhatsAppQuote] Missing fields for quotation:`, missingFields);
        showToastMsg(`Quotation Incomplete! Please enter the following fields: ${missingFields.join(', ')}`, "error");
        return;
      }

      const phone = leadObj.whatsapp_number || leadObj.mobile || '';
      if (!phone || phone.trim() === '') {
         console.error("[handleSendWhatsAppQuote] Validation failed: WhatsApp/Mobile number is missing.");
         showToastMsg("Client's mobile number is missing. Please provide a valid phone number.", "error");
         return;
      }

      // Check format and extract digits
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
         console.error(`[handleSendWhatsAppQuote] Validation failed: Phone number is too short (${phone}) -> digits only: ${cleanPhone}`);
         showToastMsg("Phone number is invalid. It must contain at least 10 digits.", "error");
         return;
      }

      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      const basePkgSum = dynamicBaseSum;
      const finalAmt = dynamicFinalAmt;
      const quotNum = activeQuoteNum || `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const pkgNames = activePkgs.map(p => p.package_name).join(' + ') || 'Selected Package';
      const eventAddress = leadObj.event_location || leadObj.address || leadObj.client_residence_address || 'N/A';
      
      const message = `*Quotation Details*\n\n` +
        `Hello *${leadObj.customer_name || 'Client'}*,\n\n` +
        `Thank you for choosing us. Please find your quotation details below:\n\n` +
        `• Quotation No: ${quotNum}\n` +
        `• Event Type: ${leadObj.event_type || 'Event'}\n` +
        `• Event Date: ${leadObj.event_date || 'N/A'}\n` +
        `📍 Event Address:\n${eventAddress}\n\n` +
        `• Package Name: ${pkgNames}\n` +
        `• Package Amount: ₹${basePkgSum.toLocaleString('en-IN')}\n` +
        `• Discount: ₹${quoteDiscount.toLocaleString('en-IN')}\n` +
        `• Additional Charges: ₹${quoteAdditional.toLocaleString('en-IN')}\n` +
        `• Final Quotation Amount: ₹${finalAmt.toLocaleString('en-IN')}\n\n` +
        `Please let us know if you have any questions. Thank you!`;

      console.log(`[handleSendWhatsAppQuote] Generating WhatsApp link for ${formattedPhone}...`);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      
      const windowRef = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      if (windowRef) {
         console.log(`[handleSendWhatsAppQuote] Successfully opened WhatsApp for ${formattedPhone}`);
      } else {
         console.error(`[handleSendWhatsAppQuote] Failed to open WhatsApp window (Popup blocker might be active). URL: ${whatsappUrl}`);
         showToastMsg("Failed to open WhatsApp. Please check if pop-ups are blocked by your browser.", "error");
      }
    } catch (err: any) {
      console.error("[handleSendWhatsAppQuote] Unexpected error occurred:", err);
      showToastMsg(`Failed to send WhatsApp quote: ${err.message || 'Unknown error'}`, "error");
    }
  };

  const handleSendEmailQuote = (isEdit: boolean) => {
    const leadObj = getLeadInfoForQuote(isEdit);
    const activePkgs = getSelectedPkgsInfo(isEdit);
    const basePkgSum = dynamicBaseSum;
    const finalAmt = dynamicFinalAmt;
    const quotNum = activeQuoteNum || `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const pkgNames = activePkgs.map(p => p.package_name).join(' + ') || 'Selected Package';
    const email = leadObj.email || '';
    
    const subject = `Photocrew Pictures - Custom Quotation Details (${quotNum})`;
    const body = `Dear ${leadObj.customer_name || 'Client'},\n\n` +
      `Thank you for reach out to us! We are pleased to provide the custom quotation details for your upcoming ${leadObj.event_type || 'Event'} shoot.\n\n` +
      `Quotation Number: ${quotNum}\n` +
      `Selected Package: ${pkgNames}\n` +
      `Package Amount: Rs. ${basePkgSum.toLocaleString('en-IN')}\n` +
      `Discount Applied: Rs. ${quoteDiscount.toLocaleString('en-IN')}\n` +
      `Additional Services: Rs. ${quoteAdditional.toLocaleString('en-IN')}\n` +
      `Final Quotation Amount: Rs. ${finalAmt.toLocaleString('en-IN')}\n\n` +
      `We will follow up shortly to discuss any specific adjustments you might need.\n\n` +
      `Warm regards,\n` +
      `The Photocrew Pictures Team\n` +
      `https://www.photocrewpictures.com/`;

    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const renderQuotationAndStep4Section = (isEdit: boolean) => {
    const activePkgs = getSelectedPkgsInfo(isEdit);
    const basePkgSum = dynamicBaseSum;
    const finalAmt = dynamicFinalAmt;
    const pkgNames = activePkgs.map(p => p.package_name).join(' + ') || 'Selected Package';

    const budgetValue = isEdit ? wizardLeadData.budget : createForm.budget;
    const setBudget = (val: number | '') => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, budget: val === '' ? 0 : val }));
      } else {
        setCreateForm(prev => ({ ...prev, budget: val }));
      }
    };

    const remarksValue = isEdit ? wizardLeadData.remarks : createForm.remarks;
    const setRemarks = (val: string) => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, remarks: val }));
      } else {
        setCreateForm(prev => ({ ...prev, remarks: val }));
      }
    };

    const notesValue = isEdit ? wizardLeadData.notes : internalNotes;
    const setNotes = (val: string) => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, notes: val }));
      } else {
        setInternalNotes(val);
      }
    };

    const followUpValue = isEdit ? wizardLeadData.next_follow_up_date : followUpDate;
    const setFollowUp = (val: string) => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, next_follow_up_date: val }));
      } else {
        setFollowUpDate(val);
      }
    };

    const leadValue = isEdit ? wizardLeadData.lead_value : createForm.lead_value;
    const setLeadValue = (val: number | '') => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, lead_value: val === '' ? 0 : val }));
      } else {
        setCreateForm(prev => ({ ...prev, lead_value: val }));
      }
    };

    const leadScore = isEdit ? wizardLeadData.lead_score : createForm.lead_score;
    const setLeadScore = (val: number | '') => {
      if (isEdit) {
        setWizardLeadData(prev => ({ ...prev, lead_score: val === '' ? 0 : val }));
      } else {
        setCreateForm(prev => ({ ...prev, lead_score: val }));
      }
    };

    return (
      <div className="space-y-6">
        {/* Section 1: Proposed Client Budget */}
        <div className="bg-slate-900/50 border border-slate-805/40 rounded-xl p-4.5 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wide font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <span>💰</span> Section 1: Proposed Client Budget
          </h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Proposed Client Budget (₹) *
              </label>
              <input
                id={isEdit ? "wizard_edit_step4_first_field" : "wizard_create_step4_first_field"}
                type="number"
                required
                value={budgetValue === 0 ? '' : budgetValue}
                onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="E.g., 50000"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            Auto-filled with package price (₹{basePkgSum.toLocaleString('en-IN')}) but remains fully editable.
          </p>
        </div>

        {/* Deliverables Section with Add / Edit / Remove functionality */}
        <div className="bg-slate-900/50 border border-slate-805/40 rounded-xl p-4.5 space-y-4 shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-800 pb-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
              <span>📦</span> Section 1.5: Deliverables & Specifications Management
            </h4>
            <p className="text-[10px] text-slate-400">
              Review and customize package inclusions and deliverables. Changes automatically update the final pricing amounts.
            </p>
          </div>

          {/* List of Deliverables in tabular grid */}
          <div className="space-y-4">
            {/* List 1: Package Deliverables (Base) */}
            <div className="space-y-2">
              <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Package Base Deliverables (Base Package Deliverables)
              </h5>
              {quoteServices.filter(s => !s.isAdditional).length === 0 ? (
                <p className="text-[10px] text-slate-500 italic px-2 font-mono">No base package deliverables configured.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
                  <table className="w-full text-left text-xs min-w-[300px]">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                        <th className="py-2.5 px-3">Service / Deliverables</th>
                        <th className="py-2.5 px-3 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {quoteServices.filter(s => !s.isAdditional).map(item => (
                        <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleEditServiceItem(item.id, { name: e.target.value })}
                              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                              placeholder="Deliverable Name..."
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceItem(item.id)}
                              className="text-red-400 hover:text-red-350 hover:bg-red-500/10 px-2 py-1 rounded text-[10px] font-mono transition-colors font-bold"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* List 2: Additional Services & Add-ons */}
            <div className="space-y-2">
              <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Additional Deliverables & Add-ons
              </h5>
              {quoteServices.filter(s => s.isAdditional).length === 0 ? (
                <p className="text-[10px] text-slate-500 italic px-2 font-mono pb-1">No custom additional deliverables added yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
                  <table className="w-full text-left text-xs min-w-[300px]">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                        <th className="py-2.5 px-3">Service / Deliverables</th>
                        <th className="py-2.5 px-3 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {quoteServices.filter(s => s.isAdditional).map(item => (
                        <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleEditServiceItem(item.id, { name: e.target.value })}
                              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                              placeholder="Deliverable Name..."
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceItem(item.id)}
                              className="text-red-400 hover:text-red-350 hover:bg-red-500/10 px-2 py-1 rounded text-[10px] font-mono transition-colors font-bold"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Add Deliverable Form Control */}
          <div className="bg-slate-950/80 border border-slate-800/60 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-300 font-mono uppercase tracking-wider">➕ Add Custom Deliverable Node</span>
              {!isAddingInline ? (
                <button
                  type="button"
                  onClick={() => setIsAddingInline(true)}
                  className="bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/25 rounded px-3 py-1 text-xs font-mono font-bold transition-all shadow-sm"
                >
                  + Add Deliverable
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingInline(false)}
                  className="text-slate-400 hover:text-slate-300 text-xs font-mono"
                >
                  Cancel Add
                </button>
              )}
            </div>

            {isAddingInline && (
              <div className="space-y-4 border-t border-slate-800/50 pt-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Deliverable Name</label>
                    <input
                      type="text"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder="e.g. Extra Album, Same Day Edit..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={newServiceQty}
                        onChange={(e) => setNewServiceQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Unit Price (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none font-mono text-right"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Scope Section</label>
                    <div className="flex gap-2 h-8 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          const newService = {
                            id: `add_base_${Date.now()}`,
                            name: newServiceName.trim() || 'New Package Deliverable',
                            qty: Math.max(1, newServiceQty),
                            price: Math.max(0, newServicePrice),
                            isAdditional: false
                          };
                          setQuoteServices(prev => [...prev, newService]);
                          setNewServiceName('');
                          setNewServiceQty(1);
                          setNewServicePrice(0);
                        }}
                        className="flex-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 rounded py-1 px-2 text-[10px] font-mono font-bold transition-all text-center"
                      >
                        Add to Base Pkg
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newService = {
                            id: `add_addl_${Date.now()}`,
                            name: newServiceName.trim() || 'New Additional Service',
                            qty: Math.max(1, newServiceQty),
                            price: Math.max(0, newServicePrice),
                            isAdditional: true
                          };
                          setQuoteServices(prev => [...prev, newService]);
                          setNewServiceName('');
                          setNewServiceQty(1);
                          setNewServicePrice(0);
                        }}
                        className="flex-1 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/25 rounded py-1 px-2 text-[10px] font-mono font-bold transition-all text-center"
                      >
                        Add to Add-on
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Add presets requested by user */}
                <div className="pt-1.5 border-t border-slate-900 space-y-1">
                  <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-mono">⚡ Quick Suggest Presets</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Extra Album', price: 8000, isAdd: true },
                      { name: 'Additional Photographer', price: 15000, isAdd: true },
                      { name: 'Same Day Edit', price: 12000, isAdd: true },
                      { name: 'Live Streaming', price: 10000, isAdd: true },
                      { name: 'Drone Coverage', price: 10000, isAdd: false },
                      { name: 'LED Wall', price: 10050, isAdd: false }
                    ].map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          const id = `preset_${Date.now()}_${idx}`;
                          const newService = {
                            id,
                            name: preset.name,
                            qty: 1,
                            price: preset.price,
                            isAdditional: preset.isAdd
                          };
                          setQuoteServices(prev => [...prev, newService]);
                        }}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 rounded px-2 py-1 text-[9px] font-mono transition-all"
                      >
                        + {preset.name} (₹{preset.price.toLocaleString('en-IN')})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Quotation Details */}
        <div className="bg-slate-900/50 border border-slate-805/40 rounded-xl p-4.5 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wide font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <span>📋</span> Section 2: Quotation Details
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quotation Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Quotation Number (Auto-Generated)
              </label>
              <input
                type="text"
                value={activeQuoteNum}
                onChange={(e) => setActiveQuoteNum(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
              />
            </div>

            {/* Package Amount (Read-only Display representing Base Price) */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Package Base Price (₹)
              </label>
              <div className="w-full bg-slate-950/60 border border-slate-850/50 rounded-lg py-2 px-3 text-xs text-slate-400 font-mono flex items-center justify-between">
                <span className="break-words max-w-[200px]">{pkgNames}</span>
                <span className="font-bold text-slate-200">₹{basePkgSum.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Quotation Discount (₹)
              </label>
              <input
                type="number"
                value={quoteDiscount || ''}
                onChange={(e) => setQuoteDiscount(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
              />
            </div>

            {/* Additional Services Cost */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Additional Services Cost (₹)
              </label>
              <input
                type="number"
                value={quoteAdditional || ''}
                onChange={(e) => setQuoteAdditional(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
              />
            </div>
          </div>

          {/* Final Calculated Amount Badge */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between shadow-inner mt-2">
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide font-mono">Final Quotation Amount</p>
              <p className="text-[9px] text-slate-500 font-mono">Formula: Base Price (₹{basePkgSum}) - Disc (₹{quoteDiscount}) + Addl (₹{quoteAdditional})</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-amber-500 font-mono">
                ₹{finalAmt.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Remarks */}
        <div className="bg-slate-900/50 border border-slate-805/40 rounded-xl p-4.5 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <span>✍️</span> Section 3: Remarks & Follow-up
          </h4>

          <div className="space-y-4">
            {/* Customer Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Customer Inbound Scope & Demands (Remarks)
              </label>
              <textarea
                rows={2}
                placeholder="List customized requests, physical albums requirement, or crew limits."
                value={remarksValue || ''}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
              ></textarea>
            </div>

            {/* Internal notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Internal Sales Coordinator Notes (Private CRM Notes)
              </label>
              <textarea
                rows={2}
                placeholder="E.g., Client seems premium, referred by relative, follow up quickly."
                value={notesValue || ''}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
              ></textarea>
            </div>

            {/* Follow-up Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Next Scheduled CRM Follow-up Date (Optional)
              </label>
              <input
                type="date"
                value={followUpValue || ''}
                onChange={(e) => setFollowUp(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-550/20 transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Actions */}
        <div className="bg-slate-900/50 border border-slate-805/40 rounded-xl p-4.5 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <span>⚙️</span> Section 4: Quotation Actions
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Download PDF */}
            <button
              type="button"
              onClick={() => handleDownloadQuotePDF(isEdit)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded-lg transition-all border border-red-900/40 active:scale-[0.98] cursor-pointer"
            >
              <span>📄</span> Download PDF Document
            </button>

            {/* Send WhatsApp */}
            <button
              type="button"
              onClick={() => handleSendWhatsAppQuote(isEdit)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 rounded-lg transition-all border border-emerald-900/40 active:scale-[0.98] cursor-pointer"
            >
              <span>💬</span> Send Quotation via WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  };

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

    setCrmWizardStep(1);
    const activePackages = (leadPackages || []).filter(lp => lp.lead_id === lead.lead_id);
    const primaryLP = activePackages[0];
    
    // Find the latest quotation for this lead if it exists
    const latestQuote = [...(quotations || [])]
      .filter(q => q.lead_id === lead.lead_id)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];

    if (latestQuote) {
      setActiveQuoteNum(latestQuote.quotation_number || '');
      setQuoteDiscount(latestQuote.discount_amount || 0);
      setQuoteAdditional(latestQuote.additional_services_cost || 0);
    }

    const matchedPkgId = latestQuote?.package_id || primaryLP?.package_id || lead.Select_Package_Option || '';
    const matchedPkg = (packages || []).find(p => p.package_id === matchedPkgId);

    setWizardLeadData({
      customer_name: lead.customer_name || '',
      mobile: lead.mobile || '',
      whatsapp_number: lead.whatsapp_number || lead.mobile || '',
      email: lead.email || '',
      address: lead.address || '',
      city: latestQuote?.city || lead.city || '',
      state: latestQuote?.state || lead.state || '',
      pincode: latestQuote?.pincode || lead.pincode || '',
      client_residence_address: latestQuote?.client_residence_address || lead.client_residence_address || '',
      desired_event_shoot_type: latestQuote?.desired_event_shoot_type || lead.desired_event_shoot_type || '',
      Select_Package_Option: lead.Select_Package_Option || latestQuote?.Select_Package_Option || primaryLP?.package_id || '',
      // Step 2
      event_type: lead.event_type || '',
      custom_event_name: lead.custom_event_name || '',
      event_date: lead.event_date || '',
      event_time: lead.event_time || '',
      reporting_time: lead.reporting_time || '08:00',
      event_location: lead.event_location || '',
      lead_source: lead.lead_source || 'Reference',
      shoot_type: lead.shoot_type || '',
      // Step 3
      selected_package_id: latestQuote?.package_id || primaryLP?.package_id || lead.Select_Package_Option || '',
      package_cost: lead.package_price || latestQuote?.package_price || (primaryLP ? Number(primaryLP.package_cost) : (matchedPkg ? Number(matchedPkg.price) : 0)),
      package_price: lead.package_price || latestQuote?.package_price || (primaryLP ? Number(primaryLP.package_cost) : (matchedPkg ? Number(matchedPkg.price) : 0)),
      deliverables: latestQuote?.deliverables_description || primaryLP?.deliverables_description || matchedPkg?.deliverables || '',
      deliverables_description: latestQuote?.deliverables_description || primaryLP?.deliverables_description || matchedPkg?.deliverables || '',
      notes_special_customizations: latestQuote?.notes_special_customizations || primaryLP?.notes_special_customizations || '',
      notes: lead.remarks || '',
      // Step 4
      budget: latestQuote?.quotation_amount || lead.budget || 0,
      final_quoted_amount: latestQuote?.final_amount || (primaryLP ? Number(primaryLP.final_amount) : 0),
      remarks: lead.remarks || '',
      next_follow_up_date: '',
      // Step 5
      status: lead.status || 'New Lead',
      // Order Confirmed Rule fields
      confirmed_event_date: lead.event_date || '',
      confirmed_event_time: lead.event_time || '',
      final_amount: 0,
      advance_received: 0,
      total_pax: lead.total_pax || 0,
      reference_source: lead.reference_source || '',
      lead_value: lead.lead_value || 0,
      lead_score: lead.lead_score || 0,
      booking_status: lead.booking_status || 'Pending',
    });

    setFollowUpForm({
      call_notes: '',
      next_follow_up_date: '',
      status: lead.status,
      quotation_amount: 0,
      negotiation_notes: '',
      event_date: lead.event_date || '',
      event_time: lead.event_time || '',
      reporting_time: lead.reporting_time || '08:00',
      advance_received: 0,
      payment_mode: 'UPI',
    });
    setConfirmForm({
      package_name: lead.event_type + ' Premium Package',
      quotation_amount: 0,
      advance_received: 0,
      event_date: lead.event_date || '',
      event_time: lead.event_time || '',
      payment_mode: 'UPI',
      notes: '',
    });
  };

  const handlePackageChange = (packageId: string) => {
    const pkg = packages.find((p) => p.package_id === packageId);
    if (pkg) {
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: packageId,
        Select_Package_Option: packageId,
        package_cost: Number(pkg.price),
        deliverables: pkg.deliverables || '',
        notes: pkg.seasonal_offer ? `Seasonal Offer: ${pkg.seasonal_offer}` : prev.notes,
        budget: Number(pkg.price),
        final_quoted_amount: Number(pkg.price),
      }));
    } else {
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: '',
        Select_Package_Option: '',
      }));
    }
  };

  const handleSaveStep = async (step: number) => {
    if (!selectedLead) return;
    setIsSaving(true);
    try {
      if (step === 1) {
        if (!wizardLeadData.mobile) {
          showToastMsg("Phone Number is required.", "error");
          setIsSaving(false);
          return;
        }
        if (!validateIndianMobile(wizardLeadData.mobile)) {
          showToastMsg("Please enter a valid Indian mobile number (10 digits starting with 6-9).", "error");
          setIsSaving(false);
          return;
        }
        if (!wizardLeadData.lead_source) {
          showToastMsg("Lead Source is required.", "error");
          setIsSaving(false);
          return;
        }
        await updateLead(selectedLead.lead_id, {
          customer_name: wizardLeadData.customer_name || 'Inbound Prospect',
          mobile: wizardLeadData.mobile,
          whatsapp_number: wizardLeadData.whatsapp_number,
          email: wizardLeadData.email,
          address: wizardLeadData.address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode,
          client_residence_address: wizardLeadData.client_residence_address,
          lead_source: wizardLeadData.lead_source,
          total_pax: wizardLeadData.total_pax,
          reference_source: wizardLeadData.reference_source,
          Select_Package_Option: wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || ''
        });
        showToastMsg("CRM Updated Successfully.", "success");
      } else if (step === 2) {
        if (!wizardLeadData.event_type) {
          showToastMsg("Please select Event Type.", "error");
          setIsSaving(false);
          return;
        }
        if (wizardLeadData.event_type === 'Other' && (!wizardLeadData.custom_event_name || wizardLeadData.custom_event_name.trim() === '')) {
          showToastMsg("Please enter a Custom Event Name.", "error");
          setIsSaving(false);
          return;
        }
        await updateLead(selectedLead.lead_id, {
          event_type: wizardLeadData.event_type,
          custom_event_name: wizardLeadData.custom_event_name,
          custom_event_type: wizardLeadData.event_type === 'Other' ? wizardLeadData.custom_event_name : undefined,
          event_date: wizardLeadData.event_date,
          event_time: wizardLeadData.event_time,
          reporting_time: wizardLeadData.reporting_time,
          event_location: wizardLeadData.event_location,
          lead_source: wizardLeadData.lead_source,
          shoot_type: wizardLeadData.shoot_type,
          desired_event_shoot_type: wizardLeadData.desired_event_shoot_type,
          client_residence_address: wizardLeadData.client_residence_address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode,
          total_pax: wizardLeadData.total_pax !== '' && wizardLeadData.total_pax !== undefined ? Number(wizardLeadData.total_pax) : 0,
          reference_source: wizardLeadData.reference_source || '',
          Select_Package_Option: wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || ''
        });
        showToastMsg("CRM Updated Successfully.", "success");
      } else if (step === 3) {
        if (!wizardLeadData.selected_package_id || wizardLeadData.selected_package_id.trim() === '') {
          showToastMsg("Please select a package before continuing.", "error");
          setIsSaving(false);
          return;
        }
        if (wizardLeadData.selected_package_id) {
          const selectedPkg = packages.find((p) => p.package_id === wizardLeadData.selected_package_id);
          await saveLeadPackages(selectedLead.lead_id, [{
            package_id: wizardLeadData.selected_package_id,
            package_name: selectedPkg?.package_name || 'Selected Package',
            package_cost: Number(wizardLeadData.package_cost),
            quantity: 1,
            total_amount: Number(wizardLeadData.package_cost),
            discount: 0,
            final_amount: Number(wizardLeadData.package_cost),
            deliverables_description: wizardLeadData.deliverables,
            notes_special_customizations: wizardLeadData.notes,
            additional_services_cost: 0
          }]);
        }
        await updateLead(selectedLead.lead_id, {
          budget: Number(wizardLeadData.package_cost),
          package_price: Number(wizardLeadData.package_cost),
          deliverables_description: wizardLeadData.deliverables,
          notes_special_customizations: wizardLeadData.notes,
          remarks: wizardLeadData.notes,
          Select_Package_Option: wizardLeadData.selected_package_id,
          client_residence_address: wizardLeadData.client_residence_address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode
        });
        showToastMsg("CRM Updated Successfully.", "success");
      } else if (step === 4) {
        await updateLead(selectedLead.lead_id, {
          budget: Number(wizardLeadData.budget),
          remarks: wizardLeadData.remarks,
          client_residence_address: wizardLeadData.client_residence_address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode,
          Select_Package_Option: wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || ''
        });
        showToastMsg("CRM Updated Successfully.", "success");
      } else if (step === 5) {
        if (wizardLeadData.status === 'Order Confirmed') {
          if (!wizardLeadData.confirmed_event_date) {
            showToastMsg("Please select Confirmed Event Date.", "error");
            setIsSaving(false);
            return;
          }
          if (!wizardLeadData.confirmed_event_time) {
            showToastMsg("Please select Confirmed Event Time.", "error");
            setIsSaving(false);
            return;
          }
          if (wizardLeadData.final_amount === undefined || wizardLeadData.final_amount === 0 || isNaN(wizardLeadData.final_amount)) {
            showToastMsg("Please enter Final Amount.", "error");
            setIsSaving(false);
            return;
          }
          if (wizardLeadData.advance_received === undefined || isNaN(wizardLeadData.advance_received)) {
            showToastMsg("Please enter Advance Paid Amount.", "error");
            setIsSaving(false);
            return;
          }
          await confirmOrder(
            selectedLead.lead_id,
            selectedLead.event_type + ' Premium Package',
            Number(wizardLeadData.final_amount),
            Number(wizardLeadData.advance_received),
            wizardLeadData.confirmed_event_date,
            wizardLeadData.confirmed_event_time,
            'UPI',
            wizardLeadData.remarks || 'Confirmed from CRM activity logger',
            wizardLeadData.reporting_time || '08:00'
          );
          setSelectedLead(null);
          showToastMsg("Order Confirmed Successfully.", "success");
        } else {
          await updateLeadFollowUp(
            selectedLead.lead_id,
            wizardLeadData.status,
            wizardLeadData.remarks || 'Status updated from CRM Multi-step Desk',
            wizardLeadData.next_follow_up_date || '',
            Number(wizardLeadData.final_quoted_amount || wizardLeadData.budget),
            wizardLeadData.remarks
          );
          showToastMsg("CRM Updated Successfully.", "success");
        }
      }

      if (step < 5) {
        setCrmWizardStep(step + 1);
        setTimeout(() => {
          document.getElementById('crm-wizard-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      } else {
        setSelectedLead(null);
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);
      
      const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;
      const newStatus = wizardLeadData?.status || null;
      
      logStatusUpdateError({
        leadId: selectedLead?.lead_id || null,
        orderId: null,
        oldStatus,
        newStatus,
        updatePayload: {
          budget: Number(wizardLeadData?.package_cost || wizardLeadData?.budget || 0),
          package_price: Number(wizardLeadData?.package_cost || 0),
          remarks: wizardLeadData?.remarks || wizardLeadData?.notes || '',
          Select_Package_Option: wizardLeadData?.selected_package_id || wizardLeadData?.Select_Package_Option || ''
        },
        insertPayload: null,
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "CRM Multi-step Wizard Status Update Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      showToastMsg(parsed.reason, "error");
    } finally {
      setIsSaving(false);
    }
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
      whatsapp_number: cust.whatsapp_number || cust.mobile,
      email: cust.email,
      address: cust.address,
      city: cust.city,
      state: cust.state,
      pincode: cust.pincode,
      client_residence_address: cust.client_residence_address,
      lead_source: 'Repeat Customer Desk',
      event_type: reorderForm.event_type,
      custom_event_name: reorderForm.event_type === 'Other' ? reorderForm.custom_event_name : undefined,
      custom_event_type: reorderForm.event_type === 'Other' ? reorderForm.custom_event_name : undefined,
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
      event_type: 'Pre Weddings',
      custom_event_name: '',
      custom_event_type: '',
      event_date: '',
      event_time: '12:00',
      event_location: '',
      package_name: '',
      quotation_amount: 0,
      advance_received: 0,
    });
    setActiveTab('list');
  };

  // Wizard action helpers and handlers
  const autoScrollToFormHeader = () => {
    const el = document.getElementById('create_lead_form_heading');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const formEl = document.getElementById('create_lead_form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const getRemarksPayload = (formRemarks: string, intNotes: string, fDate: string, wNum: string, adr: string, cty: string, resAdr?: string) => {
    let result = '';
    if (wNum) result += `WhatsApp: ${wNum}\n`;
    if (adr) result += `Event Venue: ${adr}\n`;
    if (resAdr) result += `Residence: ${resAdr}\n`;
    if (cty) result += `City: ${cty}\n`;
    if (fDate) result += `Follow-up Date: ${fDate}\n`;
    if (intNotes) result += `Internal Notes: ${intNotes}\n`;
    if (formRemarks) result += `Remarks: ${formRemarks}\n`;
    
    if (selectedPkgIds.length > 0) {
      result += `\n--- Selected Package Customizations ---\n`;
      selectedPkgIds.forEach(id => {
        const p = PACKAGES_LIST.flatMap(cat => cat.items).find(item => item.id === id);
        if (p) {
          result += `Package: ${p.name}\n`;
          result += `  Custom Price: ₹${(pkgPrices[id] !== undefined ? pkgPrices[id] : p.cost).toLocaleString('en-IN')}\n`;
          result += `  Deliverables: ${pkgDeliverables[id] || 'N/A'}\n`;
          result += `  Notes: ${pkgNotes[id] || 'N/A'}\n`;
        }
      });
    }
    return result;
  };

  const handleWizardNext = async () => {
    if (isSaving) return;

    if (wizardStep === 1) {
      if (!createForm.mobile) {
        showToastMsg("Phone Number is required.", "error");
        return;
      }
      if (!createForm.lead_source || createForm.lead_source === '') {
        showToastMsg("Lead Source is required.", "error");
        return;
      }

      // Check Supabase Authentication and Session before creating lead
      if (supabaseClient) {
        try {
          const { data: sessionData, error: sessionErr } = await supabaseClient.auth.getSession();
          const { data: userData, error: userErr } = await supabaseClient.auth.getUser();

          const session = sessionData?.session;
          const authUser = userData?.user;

          console.log('SESSION', session);
          console.log('USER', authUser);

          if (sessionErr || userErr) {
            console.warn("Session/user fetch error:", sessionErr || userErr);
          }

          // If BOTH session and authUser are null AND we don't have a currentUser in React state
          if (!session && !authUser && !currentUser) {
            showToastMsg("Please login again.", "error");
            return;
          }

          // Check if session is expired
          const isExpired = session?.expires_at ? (session.expires_at <= Math.floor(Date.now() / 1000)) : false;
          if (isExpired && !authUser) {
            showToastMsg("Session expired.", "error");
            return;
          }

          // Users Table Lookup
          const currentUid = authUser?.id || session?.user?.id || currentUser?.id;
          const emailFromAuth = authUser?.email || session?.user?.email || currentUser?.email;

          let dbUser: any = null;
          if (currentUid) {
            const { data: userById, error: dbUserErr } = await supabaseClient
              .from('users')
              .select('*')
              .eq('id', currentUid)
              .maybeSingle();

            dbUser = userById;
            if (dbUserErr) {
              console.warn("Users table lookup failed in UI:", dbUserErr.message);
            }
          }

          if (!dbUser && emailFromAuth) {
            const { data: dbUserByEmail } = await supabaseClient
              .from('users')
              .select('*')
              .eq('email', emailFromAuth.toLowerCase().trim())
              .maybeSingle();
            
            if (dbUserByEmail && currentUid) {
              console.log("Aligning user profile ID during lead creation...");
              await supabaseClient
                .from('users')
                .update({ id: currentUid })
                .eq('email', emailFromAuth.toLowerCase().trim());
              dbUser = { ...dbUserByEmail, id: currentUid };
            } else if (dbUserByEmail) {
              dbUser = dbUserByEmail;
            }
          }

          let finalUser = currentUser;
          if (dbUser) {
            finalUser = mapUserFieldsFromDb(dbUser);
          }

          if (!finalUser) {
            showToastMsg("User record missing from users table.", "error");
            return;
          }

          if (emailFromAuth && finalUser.email && finalUser.email.toLowerCase().trim() !== emailFromAuth.toLowerCase().trim()) {
            showToastMsg("User record email does not match logged-in account.", "error");
            return;
          }

          if (!finalUser.role) {
            showToastMsg("User role not loaded correctly.", "error");
            return;
          }

          if (!finalUser.active) {
            showToastMsg("User account is deactivated.", "error");
            return;
          }

          if (finalUser.role !== 'Sales Team' && finalUser.role !== 'Business Owner') {
            showToastMsg("User does not have permission to create leads.", "error");
            return;
          }
        } catch (authErr: any) {
          showToastMsg(`Authentication error: ${authErr.message || authErr}`, "error");
          return;
        }
      } else {
        if (!currentUser) {
          showToastMsg("Please login again.", "error");
          return;
        }
        if (currentUser.role !== 'Sales Team' && currentUser.role !== 'Business Owner') {
          showToastMsg("User does not have permission to create leads.", "error");
          return;
        }
      }

      if (!validateIndianMobile(createForm.mobile)) {
        showToastMsg("Please enter a valid Indian mobile number starting with 6, 7, 8, or 9 (10 digits).", "error");
        return;
      }
      if (createForm.email && createForm.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(createForm.email.trim())) {
          showToastMsg("Please enter a valid email address.", "error");
          return;
        }
      }

      try {
        setIsSaving(true);
        const finalSource = createForm.lead_source === 'Other' ? (otherSource ? `Other: ${otherSource}` : 'Other') : createForm.lead_source;
        if (!createdLeadId) {
          const newId = await addLead({
            customer_name: createForm.customer_name || 'Inbound Prospect',
            mobile: createForm.mobile,
            alternate_mobile: (createForm.alternate_mobile && createForm.alternate_mobile.trim() !== '' && createForm.alternate_mobile.trim() !== '+91') ? createForm.alternate_mobile : undefined,
            email: createForm.email,
            lead_source: finalSource,
            whatsapp_number: createForm.whatsapp_number,
            address: createForm.address,
            city: createForm.city,
            state: createForm.state,
            pincode: createForm.pincode,
            client_residence_address: createForm.client_residence_address,
            shoot_type: createForm.shoot_type,
            desired_event_shoot_type: createForm.desired_event_shoot_type,
            total_pax: createForm.total_pax !== '' ? Number(createForm.total_pax) : undefined,
            reference_source: createForm.reference_source,
            booking_status: createForm.booking_status || undefined,
            event_type: createForm.event_type || 'Other',
            event_date: createForm.event_date || new Date().toISOString().split('T')[0],
            event_time: createForm.event_time || '12:00',
            event_location: createForm.event_location || 'TBD',
            budget: Number(createForm.budget) || 0,
            remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
          });
          setCreatedLeadId(newId);
          console.log(`Created lead with ID: ${newId}`);
        } else {
          await updateLead(createdLeadId, {
            customer_name: createForm.customer_name || 'Inbound Prospect',
            mobile: createForm.mobile,
            alternate_mobile: (createForm.alternate_mobile && createForm.alternate_mobile.trim() !== '' && createForm.alternate_mobile.trim() !== '+91') ? createForm.alternate_mobile : undefined,
            email: createForm.email,
            lead_source: finalSource,
            whatsapp_number: createForm.whatsapp_number,
            address: createForm.address,
            city: createForm.city,
            state: createForm.state,
            pincode: createForm.pincode,
            client_residence_address: createForm.client_residence_address,
            desired_event_shoot_type: createForm.desired_event_shoot_type,
            total_pax: createForm.total_pax !== '' ? Number(createForm.total_pax) : undefined,
            reference_source: createForm.reference_source,
            booking_status: createForm.booking_status || undefined,
            remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
          });
        }
        setWizardStep(2);
        showToastMsg("Customer details saved successfully.", "success");
        setTimeout(() => {
          autoScrollToFormHeader();
          document.getElementById('wizard_step2_first_field')?.focus();
        }, 100);
      } catch (err: any) {
        console.error("Step 1 saving failed:", err);
        const errMsg = err.message || String(err);
        let displayedMsg = errMsg;
        
        const lowerMsg = errMsg.toLowerCase();
        if (lowerMsg.includes("row-level security policy") || lowerMsg.includes("rls") || lowerMsg.includes("security policy")) {
          displayedMsg = "Lead insert blocked by RLS policy.";
        } else if (lowerMsg.includes("user record missing") || lowerMsg.includes("missing from users table") || lowerMsg.includes("missing from users")) {
          displayedMsg = "User record missing from users table.";
        } else if (lowerMsg.includes("session expired") || lowerMsg.includes("jwt expired")) {
          displayedMsg = "Session expired.";
        } else if (lowerMsg.includes("permission") || lowerMsg.includes("permission denied")) {
          displayedMsg = "User does not have permission to create leads.";
        } else if (lowerMsg.includes("login") || lowerMsg.includes("unauthenticated") || lowerMsg.includes("jwt")) {
          displayedMsg = "Please login again.";
        } else {
          displayedMsg = errMsg;
        }
        
        showToastMsg(displayedMsg, "error");
      } finally {
        setIsSaving(false);
      }
    }

    else if (wizardStep === 2) {
      if (!createForm.event_type || createForm.event_type === '') {
        showToastMsg("Please select Event Type.", "error");
        return;
      }
      if (createForm.event_type === 'Other' && (!createForm.custom_event_name || createForm.custom_event_name.trim() === '')) {
        showToastMsg("Please enter a Custom Event Name.", "error");
        return;
      }
      if (!createForm.desired_event_shoot_type || createForm.desired_event_shoot_type === '') {
        showToastMsg("Please select a Desired Event Shoot Type.", "error");
        return;
      }

      try {
        setIsSaving(true);
        const finalSource = createForm.lead_source === 'Other' ? (otherSource ? `Other: ${otherSource}` : 'Other') : createForm.lead_source;
        const finalEventType = createForm.event_type === 'Other' ? 'Other' : createForm.event_type;
        const finalCustomEventName = createForm.event_type === 'Other' ? createForm.custom_event_name : undefined;
        const finalCustomEventType = createForm.event_type === 'Other' ? createForm.custom_event_name : undefined;

        await updateLead(createdLeadId!, {
          event_type: finalEventType,
          custom_event_name: finalCustomEventName,
          custom_event_type: finalCustomEventType,
          event_date: createForm.event_date || new Date().toISOString().split('T')[0],
          event_time: createForm.event_time || '12:00',
          reporting_time: reportingTime,
          event_location: createForm.event_location || 'TBD',
          lead_source: finalSource || 'Walk-in',
          shoot_type: createForm.desired_event_shoot_type || createForm.shoot_type || '',
          desired_event_shoot_type: createForm.desired_event_shoot_type,
          whatsapp_number: createForm.whatsapp_number,
          address: createForm.address,
          city: createForm.city,
          state: createForm.state,
          pincode: createForm.pincode,
          client_residence_address: createForm.client_residence_address,
          total_pax: createForm.total_pax !== '' && createForm.total_pax !== undefined ? Number(createForm.total_pax) : 0,
          reference_source: createForm.reference_source || '',
          remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
          Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
        });
        setWizardStep(3);
        showToastMsg("Event details saved successfully.", "success");
        setTimeout(() => {
          autoScrollToFormHeader();
          document.getElementById('wizard_step3_first_field')?.focus();
        }, 100);
      } catch (err: any) {
        console.error("Step 2 saving failed:", err);
        const errMsg = err.message || String(err);
        let displayedMsg = errMsg;
        if (errMsg.toLowerCase().includes("database") || errMsg.toLowerCase().includes("connection") || errMsg.toLowerCase().includes("failed to fetch") || errMsg.toLowerCase().includes("supabase")) {
          displayedMsg = "Database save failed: connection error.";
        } else {
          displayedMsg = `Unable to save event details: ${errMsg}`;
        }
        showToastMsg(displayedMsg, "error");
      } finally {
        setIsSaving(false);
      }
    }

    else if (wizardStep === 3) {
      if (!selectedPkgIds || selectedPkgIds.length === 0) {
        showToastMsg("Please select a package before continuing.", "error");
        return;
      }
      try {
        setIsSaving(true);
        const selectedPkgs = PACKAGES_LIST.flatMap(cat => cat.items).filter(item => selectedPkgIds.includes(item.id));
        const packagesPayload = selectedPkgs.map(pkg => ({
          package_id: pkg.id,
          package_name: pkg.name,
          package_cost: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          quantity: 1,
          total_amount: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          discount: leadDiscount,
          final_amount: pkgPrices[pkg.id] !== undefined ? pkgPrices[pkg.id] : pkg.cost,
          deliverables_description: pkgDeliverables[pkg.id] || pkg.deliverables || 'N/A',
          notes_special_customizations: pkgNotes[pkg.id] || '',
          additional_services_cost: 0
        }));
        await saveLeadPackages(createdLeadId!, packagesPayload);

        await updateLead(createdLeadId!, {
          budget: finalTotal,
          package_price: finalTotal,
          deliverables_description: selectedPkgs.map(p => pkgDeliverables[p.id] || p.deliverables || 'N/A').join('\n'),
          notes_special_customizations: selectedPkgs.map(p => pkgNotes[p.id] || '').join('\n'),
          remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
          Select_Package_Option: selectedPkgIds[0] || '',
          client_residence_address: createForm.client_residence_address,
          city: createForm.city,
          state: createForm.state,
          pincode: createForm.pincode
        });

        // Sync local states
        setCreateForm(prev => ({ 
          ...prev, 
          budget: finalTotal,
          Select_Package_Option: selectedPkgIds[0] || ''
        }));
        setFinalPackageAmount(finalTotal);

        setWizardStep(4);
        showToastMsg("Package selection saved successfully.", "success");
        setTimeout(() => {
          autoScrollToFormHeader();
          document.getElementById('wizard_create_step4_first_field')?.focus();
        }, 100);
      } catch (err: any) {
        console.error("Step 3 saving failed:", err);
        const errMsg = err.message || String(err);
        let displayedMsg = errMsg;
        if (errMsg.toLowerCase().includes("database") || errMsg.toLowerCase().includes("connection") || errMsg.toLowerCase().includes("failed to fetch") || errMsg.toLowerCase().includes("supabase")) {
          displayedMsg = "Database save failed: connection error.";
        } else {
          displayedMsg = `Unable to save packages: ${errMsg}`;
        }
        showToastMsg(displayedMsg, "error");
      } finally {
        setIsSaving(false);
      }
    }

    else if (wizardStep === 4) {
      try {
        setIsSaving(true);
        await updateLead(createdLeadId!, {
          budget: Number(createForm.budget),
          remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
          client_residence_address: createForm.client_residence_address,
          city: createForm.city,
          state: createForm.state,
          pincode: createForm.pincode,
          Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
        });
        setWizardStep(5);
        showToastMsg("Proposed budget and remarks saved successfully.", "success");
        setTimeout(() => {
          autoScrollToFormHeader();
        }, 100);
      } catch (err: any) {
        console.error("Step 4 saving failed:", err);
        const errMsg = err.message || String(err);
        let displayedMsg = errMsg;
        if (errMsg.toLowerCase().includes("database") || errMsg.toLowerCase().includes("connection") || errMsg.toLowerCase().includes("failed to fetch") || errMsg.toLowerCase().includes("supabase")) {
          displayedMsg = "Database save failed: connection error.";
        } else {
          displayedMsg = `Unable to save budget: ${errMsg}`;
        }
        showToastMsg(displayedMsg, "error");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleStatusSave = async () => {
    if (isSaving) return;
    if (!salesStatus) {
      showToastMsg("Please select a CRM Sales Funnel Pipeline Stage before saving.", "error");
      return;
    }
    try {
      setIsSaving(true);
      await updateLead(createdLeadId!, {
        status: salesStatus as CurrentStage,
        budget: finalTotal,
        package_price: finalTotal,
        deliverables_description: selectedPkgs.map(p => pkgDeliverables[p.id] || p.deliverables || 'N/A').join('\n'),
        notes_special_customizations: selectedPkgs.map(p => pkgNotes[p.id] || '').join('\n'),
        quotation_discount: quoteDiscount,
        additional_services_cost: quoteAdditional,
        client_residence_address: createForm.client_residence_address,
        city: createForm.city,
        state: createForm.state,
        pincode: createForm.pincode,
        desired_event_shoot_type: createForm.desired_event_shoot_type,
        remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
        Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
      });
      alert("Lead Saved Successfully.");
      resetForm();
      setActiveTab('list');
    } catch (err: any) {
      console.error("Step 5 status save failed:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const targetLd = leads.find(l => l.lead_id === createdLeadId);
      const oldStatus = targetLd ? (targetLd.current_status || targetLd.status || 'New Lead') : null;
      const newStatus = salesStatus || null;

      logStatusUpdateError({
        leadId: createdLeadId || null,
        orderId: null,
        oldStatus,
        newStatus,
        updatePayload: {
          status: salesStatus,
          budget: finalTotal,
          package_price: finalTotal,
          Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
        },
        insertPayload: null,
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Lead Stage Transition Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderConfirmedSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSaving) return;
    if (!confirmedEventDate) {
      alert("Please select Confirmed Event Date.");
      return;
    }
    if (!confirmedEventTime) {
      alert("Please select Confirmed Event Time.");
      return;
    }
    if (finalPackageAmount === undefined || finalPackageAmount === 0 || isNaN(finalPackageAmount)) {
      alert("Please enter Final Amount.");
      return;
    }
    if (advanceReceived === undefined || isNaN(advanceReceived)) {
      alert("Please enter Advance Paid Amount.");
      return;
    }

    try {
      setIsSaving(true);
      const selectedPkgsNames = selectedPkgs.map(p => p.name).join(' + ') || 'Custom Configured Coverage';
      await confirmOrder(
        createdLeadId!,
        selectedPkgsNames,
        finalPackageAmount,
        advanceReceived,
        confirmedEventDate,
        confirmedEventTime,
        'UPI / Cash / Bank Transfer',
        getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
        reportingTime
      );
      
      alert("Order Confirmed Successfully.");
      resetForm();
      setActiveTab('list');
    } catch (err: any) {
      console.error("Failed to commit confirmed order details:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const targetLd = leads.find(l => l.lead_id === createdLeadId);
      const oldStatus = targetLd ? (targetLd.current_status || targetLd.status || 'New Lead') : null;

      logStatusUpdateError({
        leadId: createdLeadId || null,
        orderId: null,
        oldStatus,
        newStatus: 'Order Confirmed',
        updatePayload: {
          status: 'Order Confirmed',
          event_date: confirmedEventDate,
          event_time: confirmedEventTime,
          reporting_time: reportingTime,
        },
        insertPayload: {
          order_status: 'Confirmed',
          current_stage: 'Order Confirmed',
          package_name: selectedPkgs.map(p => p.name).join(' + ') || 'Custom Configured Coverage',
          quotation_amount: finalPackageAmount,
          advance_received: advanceReceived,
        },
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Order Confirmation Pipeline Transition Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle follow up submit
  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSaving) return;

    if (followUpForm.status === 'Order Confirmed') {
      if (!followUpForm.event_date) {
        alert("Please select Confirmed Event Date.");
        return;
      }
      if (!followUpForm.event_time) {
        alert("Please select Confirmed Event Time.");
        return;
      }
      if (followUpForm.quotation_amount === undefined || followUpForm.quotation_amount === 0 || isNaN(followUpForm.quotation_amount)) {
        alert("Please enter Final Amount.");
        return;
      }
      if (followUpForm.advance_received === undefined || isNaN(followUpForm.advance_received)) {
        alert("Please enter Advance Paid Amount.");
        return;
      }

      try {
        setIsSaving(true);
        await confirmOrder(
          selectedLead.lead_id,
          selectedLead.event_type + ' Premium Package',
          Number(followUpForm.quotation_amount),
          Number(followUpForm.advance_received),
          followUpForm.event_date,
          followUpForm.event_time,
          followUpForm.payment_mode || 'UPI',
          followUpForm.call_notes || 'Confirmed from CRM activity logger',
          followUpForm.reporting_time || '08:00'
        );

        setSelectedLead(null);
        alert("Order Confirmed Successfully.");
      } catch (err: any) {
        console.error("Failed to convert lead:", err);
        const errMsg = err?.message || String(err);
        const parsed = parseStatusUpdateError(errMsg);

        const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;

        logStatusUpdateError({
          leadId: selectedLead?.lead_id || null,
          orderId: null,
          oldStatus,
          newStatus: 'Order Confirmed',
          updatePayload: {
            status: 'Order Confirmed',
            remarks: followUpForm.call_notes
          },
          insertPayload: {
            order_status: 'Confirmed',
            current_stage: 'Order Confirmed',
            package_name: selectedLead.event_type + ' Premium Package',
            quotation_amount: Number(followUpForm.quotation_amount),
            advance_received: Number(followUpForm.advance_received),
          },
          dbResponse: null,
          fullError: err
        });

        setStatusError({
          title: "Follow-up Transition to Order Confirmed Failed",
          reason: parsed.reason,
          suggestedFix: parsed.suggestedFix
        });
        alert(parsed.reason);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!followUpForm.call_notes) {
      alert('Please fill in some Call Notes to update lead follow-up.');
      return;
    }

    try {
      setIsSaving(true);
      await updateLeadFollowUp(
        selectedLead.lead_id,
        followUpForm.status,
        followUpForm.call_notes,
        followUpForm.next_follow_up_date || '',
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
      alert('CRM Updated Successfully.');
    } catch (err: any) {
      console.error("Failed to update follow-up:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;

      logStatusUpdateError({
        leadId: selectedLead?.lead_id || null,
        orderId: null,
        oldStatus,
        newStatus: followUpForm.status,
        updatePayload: {
          status: followUpForm.status,
          budget: Number(followUpForm.quotation_amount),
          remarks: followUpForm.call_notes
        },
        insertPayload: null,
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Follow-up Pipeline Status Update Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Order Confirmation Process
  const handleConfirmOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSaving) return;

    if (!confirmForm.event_date) {
      alert("Please select Confirmed Event Date.");
      return;
    }
    if (!confirmForm.event_time) {
      alert("Please select Confirmed Event Time.");
      return;
    }
    if (confirmForm.quotation_amount === undefined || confirmForm.quotation_amount === 0 || isNaN(confirmForm.quotation_amount)) {
      alert("Please enter Final Amount.");
      return;
    }
    if (confirmForm.advance_received === undefined || isNaN(confirmForm.advance_received)) {
      alert("Please enter Advance Paid Amount.");
      return;
    }

    try {
      setIsSaving(true);
      await confirmOrder(
        selectedLead.lead_id,
        confirmForm.package_name,
        Number(confirmForm.quotation_amount),
        Number(confirmForm.advance_received),
        confirmForm.event_date,
        confirmForm.event_time,
        confirmForm.payment_mode,
        confirmForm.notes,
        undefined,
        confirmForm.transaction_id
      );

      setShowConfirmModal(false);
      setSelectedLead(null);
      alert("Order Confirmed Successfully.");
    } catch (err: any) {
      console.error("Failed to convert order:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const oldStatus = selectedLead ? (selectedLead.current_status || selectedLead.status || 'New Lead') : null;

      logStatusUpdateError({
        leadId: selectedLead?.lead_id || null,
        orderId: null,
        oldStatus,
        newStatus: 'Order Confirmed',
        updatePayload: {
          status: 'Order Confirmed',
          event_date: confirmForm.event_date,
          event_time: confirmForm.event_time,
          reporting_time: undefined,
        },
        insertPayload: {
          order_status: 'Confirmed',
          current_stage: 'Order Confirmed',
          package_name: confirmForm.package_name,
          quotation_amount: Number(confirmForm.quotation_amount),
          advance_received: Number(confirmForm.advance_received),
        },
        dbResponse: null,
        fullError: err
      });

      setStatusError({
        title: "Action Button Order Confirmation Failed",
        reason: parsed.reason,
        suggestedFix: parsed.suggestedFix
      });
      alert(parsed.reason);
    } finally {
      setIsSaving(false);
    }
  };

  // Companion lead metadata parse
  const getFollowUpDate = (remarks?: string) => {
    if (!remarks) return null;
    const match = remarks.match(/Next follow-up:\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  };

  const todayStr = '2026-06-10';

  const statNewLeads = leads.filter(l => getLeadCurrentStatus(l) === 'New Lead').length;
  const statTodayFollowups = leads.filter(l => getLeadCurrentStatus(l) === 'Follow Up' && getFollowUpDate(l.remarks) === todayStr).length;
  const statOverdueFollowups = leads.filter(l => {
    if (getLeadCurrentStatus(l) !== 'Follow Up') return false;
    const fDate = getFollowUpDate(l.remarks);
    return fDate ? fDate < todayStr : false;
  }).length;
  const statQuotesSent = leads.filter(l => getLeadCurrentStatus(l) === 'Quotation Sent').length;
  const statNegotiations = leads.filter(l => getLeadCurrentStatus(l) === 'Negotiation').length;
  const statConfirmedOrders = leads.filter(l => getLeadCurrentStatus(l) === 'Order Confirmed').length;

  // Filter Leads List
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.customer_name.toLowerCase().includes(filterQuery.toLowerCase()) || 
      lead.lead_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      lead.mobile.includes(filterQuery);

    const matchesSource = filterSource === '' || lead.lead_source === filterSource;
    const leadStatus = getLeadCurrentStatus(lead);
    const matchesStatus = filterStatus === '' 
      ? true 
      : filterStatus === 'Overdue' 
        ? (() => {
            if (leadStatus !== 'Follow Up') return false;
            const fDate = getFollowUpDate(lead.remarks);
            return fDate ? fDate < todayStr : false;
          })()
        : (() => {
            const statusLower = leadStatus.toLowerCase().trim();
            const filterLower = filterStatus.toLowerCase().trim();
            if (filterLower === 'customer review') {
              return statusLower === 'customer review' || statusLower === 'client review' || statusLower === 'client review sent';
            }
            if (filterLower === 'approved') {
              return statusLower === 'approved' || statusLower === 'client approved';
            }
            if (filterLower === 'project delivered') {
              return statusLower === 'project delivered' || statusLower === 'delivered';
            }
            if (filterLower === 'project closed') {
              return statusLower === 'project closed' || statusLower === 'closed';
            }
            if (filterLower === 'new project received') {
              return statusLower === 'new project received' || statusLower === 'new order received';
            }
            if (filterLower === 'follow up') {
              return statusLower === 'follow up' || statusLower === 'follow-up';
            }
            return statusLower === filterLower;
          })();
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
  }).sort((a, b) => {
    const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_date).getTime());
    const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.created_date).getTime());
    return timeB - timeA;
  });

  return (
    <div id="sales_module" className="space-y-6">
      {statusError && (
        <div className="fixed inset-0 bg-slate-955/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex items-center gap-3">
              <span className="p-2.5 bg-red-500/20 text-red-400 rounded-xl text-lg">⚠️</span>
              <div>
                <h3 className="font-bold text-slate-100 text-sm font-sans">{statusError.title || 'Status Update Failed'}</h3>
                <p className="text-[10px] text-red-400 font-mono tracking-wider">DATABASE SCHEMA / INTEGRITY EXCEPTION</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Reason:</span>
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-red-300 font-mono leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {statusError.reason}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Suggested Fix / Schema Migration:</span>
                <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-xl p-3 text-xs text-emerald-300 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {statusError.suggestedFix}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/40 border-t border-slate-800 px-6 py-3.5 flex justify-end">
              <button
                onClick={() => setStatusError(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700"
              >
                Dismiss Details
              </button>
            </div>
          </div>
        </div>
      )}

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
                <span className="text-slate-200 break-words">{selectedLead.email}</span>
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
                <strong className="text-slate-200 font-medium">{selectedLead.event_type === 'Other' ? (selectedLead.custom_event_name || selectedLead.custom_event_type || 'Other') : selectedLead.event_type}</strong>
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
              <div>
                <span className="text-slate-500 block">City / State</span>
                <strong className="text-slate-200 font-medium">{selectedLead.city || 'N/A'} / {selectedLead.state || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Pincode</span>
                <strong className="text-slate-200 font-medium">{selectedLead.pincode || 'N/A'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Residence Address</span>
                <strong className="text-slate-200 font-medium block break-words">{selectedLead.client_residence_address || 'N/A'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block">Package Option</span>
                <strong className="text-slate-200 font-medium block break-words">
                  {(() => {
                    const pkg = packages.find(p => p.package_id === selectedLead.Select_Package_Option);
                    return pkg ? `${pkg.package_name} (${selectedLead.Select_Package_Option})` : (selectedLead.Select_Package_Option || 'Not selected');
                  })()}
                </strong>
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

            {selectedLead && isLeadLocked && (
              <div className="p-4 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left animate-fade-in relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
                    <span className="animate-pulse">🔒</span> Stage-Locked: Order Confirmed
                  </div>
                  <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                    This lead is lock-protected due to having officially transitioned to operations. Only payment schedules are editable.
                  </p>
                </div>
                {currentRole === 'Business Owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockReason('Data Correction');
                      setUnlockingRecordId(selectedLead.lead_id);
                    }}
                    className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer font-mono font-extrabold uppercase tracking-wide border border-amber-500/20 shadow-lg"
                  >
                    🔓 Owner Override
                  </button>
                )}
              </div>
            )}

            {canEdit ? (
              <form onSubmit={handleFollowUpSubmit} className="space-y-4">
                <fieldset disabled={isLeadLocked} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                    {/* Status Options */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Transition ERP Stage *
                      </label>
                      <select>
                      </select>
                    </div>
                  </div>
                </fieldset>
              </form>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}