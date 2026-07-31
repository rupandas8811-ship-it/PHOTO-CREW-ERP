import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRole, mapUserFieldsFromDb, INITIAL_PACKAGES } from './RoleContext';
import { supabaseClient } from '../supabaseClient';
import { 
  Plus, Edit, CheckSquare, Search, Filter, Ban, X, Phone, Mail, MapPin, Calendar, DollarSign, Clock, Users, ArrowRight, ChevronDown, ChevronUp, Check, Package, Trash, Trash2, Eye
} from 'lucide-react';
import { Lead, CurrentStage, LeadPackage, EVENT_TYPES, PACKAGE_CATEGORIES, ACTIVE_STAGE_GROUPS, LeadEvent } from '../types';
import { StatusText } from './ui/StatusText';
import { EventDropdownCell } from './EventDropdownCell';
import { MultiSelectDropdown } from './ui/MultiSelectDropdown';
import { CameraLensStatsCard, CameraLensTheme } from './CameraLensStatsCard';

export const SHOOT_TYPES = [
  "CANDID PHOTOGRAPHY",
  "CINEMATOGRAPHY",
  "TRADITIONAL PHOTOGRAPHY",
  "TRADITIONAL VIDEOGRAPHY",
  "DRONEGRAPHY",
  "LIVE STREAMING",
  "SEMI CANDID PHOTOGRAPHY",
  "SEMI CANDID VIDEOGRAPHY",
  "STANDARD PHOTOGRAPHY",
  "STANDARD VIDEOGRAPHY"
];
import { formatINR, formatIndianPhoneNumber, validateIndianMobile, formatTime12Hour, getCustomers, triggerAutoScrollAndFocus, normalizeCategory, parseTeamMembers } from '../utils';
import { SalesCalendar } from './SalesCalendar';
import { AddressAutocomplete } from './AddressAutocomplete';
import { jsPDF } from 'jspdf';

interface LocalEditableInputProps {
  value: string;
  disabled?: boolean;
  onChange: (val: string) => void;
  className?: string;
}

const LocalEditableInput: React.FC<LocalEditableInputProps> = ({ value, disabled, onChange, className }) => {
  const [localVal, setLocalVal] = React.useState(value);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const latestValueRef = React.useRef(value);

  React.useEffect(() => {
    latestValueRef.current = value;
    setLocalVal(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      if (newVal !== latestValueRef.current) {
        onChange(newVal);
      }
    }, 1000);
  };

  const handleBlur = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (localVal !== value) {
      onChange(localVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (localVal !== value) {
        onChange(localVal);
      }
      e.currentTarget.blur();
    }
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <input
      type="text"
      value={localVal}
      disabled={disabled}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
    />
  );
};

const validateAndFormatTime = (timeStr: any, fieldLabel: string): string | null => {
  if (timeStr === undefined || timeStr === null) return null;
  const str = String(timeStr).trim();
  if (str === '' || str === 'null' || str === 'undefined' || str === 'Invalid Date') {
    return null;
  }
  const normalized = str.replace(/\s+/g, ' ');
  const ampmMatch = normalized.toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  const hhmmMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  
  if (!ampmMatch && !hhmmMatch) {
    throw new Error(`${fieldLabel} is invalid.`);
  }

  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const period = ampmMatch[3];

    if (hours < 1 || hours > 12 || parseInt(minutes, 10) < 0 || parseInt(minutes, 10) > 59) {
      throw new Error(`${fieldLabel} is invalid.`);
    }

    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes}:00`;
  }

  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10);
    const minutes = hhmmMatch[2];
    const seconds = hhmmMatch[3] || '00';

    if (hours < 0 || hours > 23 || parseInt(minutes, 10) < 0 || parseInt(minutes, 10) > 59 || parseInt(seconds, 10) < 0 || parseInt(seconds, 10) > 59) {
      throw new Error(`${fieldLabel} is invalid.`);
    }

    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes}:${seconds}`;
  }

  throw new Error(`${fieldLabel} is invalid.`);
};

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
  const wrapCustName = doc.splitTextToSize(lead.customer_name || '', 50);
  const wrapEmail = doc.splitTextToSize(lead.email || 'Not Provided', 50);
  const displayEventType = lead.event_type === 'Other' ? (lead.custom_event_name || lead.custom_event_type || 'Other') : (lead.event_type || 'N/A');
  const wrapEventType = doc.splitTextToSize(displayEventType, 50);
  const wrapLocation = doc.splitTextToSize(lead.event_location || 'N/A', 50);

  const shootTypeStr = lead.desired_event_shoot_type || lead.shoot_type || '';
  const shootTypes = shootTypeStr ? shootTypeStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const wrapShootType = shootTypes.length > 0 
    ? shootTypes.map((st: string) => `• ${st}`) 
    : ['N/A'];  // Resolve dynamic services
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
  }

  if (additionalCharges > 0) {
    services.push({
      id: 'extra_charges',
      name: 'Extra Charges',
      qty: 1,
      price: additionalCharges,
      isAdditional: true
    });
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

    // NEW PREP FOR TEAM MEMBERS (INCLUSIONS) AND DELIVERABLES
  const orderedEventInclusions: { eventName: string; eventDate: string; eventLocation: string; members: string[] }[] = [];
  const orderedEventDeliverables: { eventName: string; pkgName: string; items: string[] }[] = [];
  let generalInclusions: string[] = [];
  const generalDeliverables: { pkgName: string; items: string[] }[] = [];

  const pkg = activePkgs[0];
  const pkgId = pkg ? (pkg.package_id || pkg.id || 'default') : 'default';
  const pkgName = pkg ? (pkg.package_name || pkg.name || 'Base Package') : 'Base Package';

  const inclusionsList = (editableInclusions?.[pkgId] || []).filter(Boolean);
  const deliverablesList = (editableDeliverables?.[pkgId] || []).filter(Boolean);

  if (lead.events && lead.events.length > 0) {
    lead.events.forEach((event: any) => {
      const eventKey = `${pkgId}_${event.id}`;
      const nameKey = `${pkgId}_${event.event_name || event.event_type || 'Unnamed Event'}`;
      const eventInclusions = editableInclusions?.[eventKey] !== undefined
        ? editableInclusions[eventKey]
        : (editableInclusions?.[nameKey] !== undefined ? editableInclusions[nameKey] : inclusionsList);

      const eventName = event.event_name || event.event_type || 'Unnamed Event';

      orderedEventInclusions.push({
        eventName,
        eventDate: event.event_date || "",
        eventLocation: event.event_location || "N/A",
        members: (eventInclusions || []).filter(Boolean)
      });

          });
  } else {
    generalInclusions = inclusionsList;
  }
  
  // Deliverables are always per-package, not per-event
  generalDeliverables.push({ pkgName, items: deliverablesList });

  const hasEventsInclusions = orderedEventInclusions.length > 0;
  const hasEventsDeliverables = orderedEventDeliverables.length > 0;

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
    if (lead.events && lead.events.length > 0) {
      lead.events.forEach((ev: any, idx: number) => {
        const wrapEvName = doc.splitTextToSize(`Event ${idx + 1}: ` + (ev.event_name || ev.event_type || 'Event'), 50);
        const wrapEvLoc = doc.splitTextToSize(ev.event_location || 'N/A', 50);
        simRightY += (wrapEvName.length * cfg.textPadding); 
        simRightY += cfg.textPadding; // Event Date
        simRightY += (wrapEvLoc.length * cfg.textPadding); 
        if (idx < lead.events.length - 1) simRightY += 2;
      });
      simRightY += cfg.textPadding; // quotation date
    } else {
      simRightY += (wrapEventType.length * cfg.textPadding);
      simRightY += cfg.textPadding;
      simRightY += (wrapLocation.length * cfg.textPadding);
      simRightY += cfg.textPadding;
    }

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

    const simTable = (items: any[]) => {
      let tableH = 4 + 7.5; 
      items.forEach((item) => {
        tableH += Math.max(7.5, 1 * cfg.rowTextHeight + cfg.rowPadding);
      });
      if (simY + tableH > 250 && tableH <= (250 - 52)) {
        simY = 52;
        simPageCount++;
      } else {
        let currentTableY = simY + 4 + 7.5;
        items.forEach((item) => {
          const rowH = Math.max(7.5, 1 * cfg.rowTextHeight + cfg.rowPadding);
          if (currentTableY + rowH > 250) {
            currentTableY = 52 + 7.5;
            simPageCount++;
          }
          currentTableY += rowH;
        });
        simY = currentTableY;
      }
      simY += cfg.tableSpacing;
    };

    if (hasEventsInclusions) {
      orderedEventInclusions.forEach((data) => {
         simY += 10.5;
         simTable(data.members);
      });
    } else if (generalInclusions.length > 0) {
      simTable(generalInclusions);
    }
    
    if (hasEventsDeliverables) {
      orderedEventDeliverables.forEach((data) => simTable(data.items));
    } else if (generalDeliverables.length > 0) {
      generalDeliverables.forEach((data) => simTable(data.items));
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
  
  if (lead.sales_staff_name) {
    const wrapStaffName = doc.splitTextToSize(lead.sales_staff_name, 50);
    leftColYOffset += (wrapStaffName.length * cfg.textPadding);
  }
  if (lead.sales_staff_mobile) {
    leftColYOffset += cfg.textPadding;
  }

  // We add one more line for Quote Date to left column
  leftColYOffset += cfg.textPadding;

  const boxHeight = leftColYOffset + cfg.boxPadding;

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

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  let curLeftY = clientY + 11.5;
  const leftLabels = [
    { label: 'Customer Name', val: wrapCustName, isWrapped: true },
    { label: 'Mobile Number', val: lead.mobile || 'N/A' },
    { label: 'Email Address', val: wrapEmail, isWrapped: true },
    { label: 'Quotation Date', val: quoteDateStr }
  ];
  if (lead.sales_staff_name) {
    leftLabels.push({ label: 'Sales Staff Name', val: doc.splitTextToSize(lead.sales_staff_name, 50), isWrapped: true });
  }
  if (lead.sales_staff_mobile) {
    leftLabels.push({ label: 'Sales Staff Mobile', val: lead.sales_staff_mobile });
  }

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

    // 2. Team Members Included section
  const drawTeamMembers = (eventName: string | null, eventDate: string, eventLocation: string, members: string[]) => {
    if (members.length === 0) return;
    const mapped = members.map((m, i) => ({ id: String(i), name: m, qty: 1, price: 0 }));
    
    if (eventName) {
       if (currentY + 30 > 250) {
         currentY = createNewPage();
       }

       doc.setFont('helvetica', 'bold');
       doc.setFontSize(9.5);
       doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
       doc.text(`Event Name: ${eventName}`, 15, currentY);
       currentY += 6;
       
       // Draw Event Details Box
       let formattedEvDate = 'N/A';
       if (eventDate) {
         try {
           const parts = eventDate.split('-');
           if (parts.length === 3) {
             const localDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
             formattedEvDate = localDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
           } else {
             formattedEvDate = new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
           }
         } catch(e) {}
       }
       
       const wrapLoc = doc.splitTextToSize(eventLocation, 100);
       const boxHeight = 12 + (wrapLoc.length * cfg.textPadding);

       doc.setFillColor(bgLightGrid[0], bgLightGrid[1], bgLightGrid[2]);
       doc.roundedRect(15, currentY, 180, boxHeight, 1.5, 1.5, 'F');
       doc.setDrawColor(226, 232, 240);
       doc.setLineWidth(0.25);
       doc.roundedRect(15, currentY, 180, boxHeight, 1.5, 1.5, 'D');

       doc.setFont('helvetica', 'bold');
       doc.setFontSize(8.5);
       doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
       doc.text('EVENT DETAILS / EVENT LOGISTICS', 20, currentY + 6);
       
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(7.5);
       doc.setTextColor(71, 85, 105);
       
       doc.text('Event Date', 20, currentY + 11.5);
       doc.text(':', 41, currentY + 11.5);
       doc.text(formattedEvDate, 43, currentY + 11.5);

       doc.text('Location', 20, currentY + 11.5 + cfg.textPadding);
       doc.text(':', 41, currentY + 11.5 + cfg.textPadding);
       wrapLoc.forEach((line: string, i: number) => {
         doc.text(line, 43, currentY + 11.5 + cfg.textPadding + (i * cfg.textPadding));
       });

       currentY += boxHeight + 6;

       drawTable('TEAM MEMBERS INCLUDED', mapped);
    } else {
       drawTable('TEAM MEMBERS INCLUDED', mapped);
    }
  };

  if (hasEventsInclusions) {
    orderedEventInclusions.forEach((data) => {
      drawTeamMembers(data.eventName, data.eventDate, data.eventLocation, data.members);
    });
  } else if (generalInclusions.length > 0) {
    drawTeamMembers(null, "", "", generalInclusions);
  }

  // 3. Additional services table
  if (additionalServices.length > 0) {
    drawTable('ADDITIONAL SPECIFICATIONS & SERVICE ADD-ONS', additionalServices);
  }

  // 4. Deliverables table
  const drawNewDeliverablesTable = (eventName: string | null, data: { pkgName: string, items: string[] }[]) => {
    if (data.length === 0) return;
    const title = eventName ? `${eventName} - PACKAGE INCLUSIONS & DELIVERABLES DETAILED LIST` : 'PACKAGE INCLUSIONS & DELIVERABLES DETAILED LIST';
    
    // Create flattened list
    const list: { type: 'pkgName' | 'header' | 'item', text: string }[] = [];
    data.forEach(d => {
      if (d.items.length === 0) return;
      list.push({ type: 'pkgName', text: `Package Name: ${d.pkgName}` });
      list.push({ type: 'header', text: `Deliverables` });
      d.items.forEach(item => {
        list.push({ type: 'item', text: item });
      });
    });

    if (list.length === 0) return;

    let tableH = 4 + 7.5; 
    list.forEach((item) => {
      const wrapped = doc.splitTextToSize(cleanText(item.text), 166);
      tableH += Math.max(7.5, wrapped.length * cfg.rowTextHeight + cfg.rowPadding);
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
    doc.text('DELIVERABLES', 19, currentY + 4.8);

    currentY += 7.5;

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.2);

    list.forEach((item, index) => {
      const cleanedText = cleanText(item.text || '');
      const wrappedText = doc.splitTextToSize(cleanedText, 166);
      const rowHeight = Math.max(7.5, wrappedText.length * cfg.rowTextHeight + cfg.rowPadding);

      if (currentY + rowHeight > 250) {
        doc.line(15, currentY, 195, currentY);
        currentY = createNewPage();

        doc.setFillColor(30, 41, 59);
        doc.rect(15, currentY, 180, 7.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('DELIVERABLES (CONTINUED)', 19, currentY + 4.8);
        currentY += 7.5;
      }

      if (item.type === 'pkgName' || item.type === 'header') {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      doc.line(15, currentY, 15, currentY + rowHeight);
      doc.line(195, currentY, 195, currentY + rowHeight);

      if (item.type === 'pkgName') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
      } else if (item.type === 'header') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.setFillColor(51, 65, 85);
        doc.circle(20, currentY + 4.3 - 0.9, 0.6, 'F');
      }

      wrappedText.forEach((line: string, i: number) => {
        const xOffset = item.type === 'item' ? 23 : 19;
        doc.text(line, xOffset, currentY + 4.3 + (i * cfg.rowTextHeight));
      });

      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
      currentY += rowHeight;
    });

    currentY += cfg.tableSpacing; 
  };


  if (hasEventsDeliverables) {
    orderedEventDeliverables.forEach((data) => {
      drawNewDeliverablesTable(data.eventName, [{ pkgName: data.pkgName, items: data.items }]);
    });
  } else if (generalDeliverables.length > 0) {
    drawNewDeliverablesTable(null, generalDeliverables);
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
        l.customer_name === 'Inbound Prospect' ? '' : l.customer_name,
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
        l.customer_name === 'Inbound Prospect' ? '' : l.customer_name,
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
          <td>${l.customer_name === 'Inbound Prospect' ? '' : l.customer_name}</td>
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
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);
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
  const [pkgTeamMembers, setPkgTeamMembers] = useState<string[]>(['']);
  const [pkgDeliverablesList, setPkgDeliverablesList] = useState<string[]>([]);
  const [pkgDeliverableInput, setPkgDeliverableInput] = useState('');
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

  React.useEffect(() => {
    const handleClose = () => {
      setIsAddFormOpen(false);
      setEditingPackage(null);
      setViewingPkgDetails(null);
      setShowStep2Popup(false);
      setShowLostModal(false);
      setShowEventForm(false);
      setShowConfirmModal(false);
      setShowFinalReportingModal(false);
      setShowStep3Popup(false);
    };
    window.addEventListener('close-all-popups', handleClose);
    return () => window.removeEventListener('close-all-popups', handleClose);
  }, []);

  // Group active packages directly loaded from Supabase!
  const categoriesList = React.useMemo(() => {
    const dbCats = Array.from(new Set((packages || []).map((p) => p.category))).filter(Boolean) as string[];
    const normalizedDbCats = dbCats.map(normalizeCategory);
    const normalizedPkgCats = PACKAGE_CATEGORIES.map(normalizeCategory);
    const customCats = normalizedDbCats.filter(c => !normalizedPkgCats.includes(c)).sort();
    return Array.from(new Set([...normalizedPkgCats, ...customCats]));
  }, [packages]);

  const PACKAGES_LIST = React.useMemo(() => {
    return categoriesList.map((cat) => ({
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
  }, [categoriesList, packages]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [crmWizardStep, setCrmWizardStep] = useState<number>(1);
  const [crmHighestStep, setCrmHighestStep] = useState<number>(1);
  const [isPackageSelectedAndSaved, setIsPackageSelectedAndSaved] = useState(false);
  const [isPackageDetailsSaved, setIsPackageDetailsSaved] = useState(false);
  const [saveErrorPopup, setSaveErrorPopup] = useState<{ title: string; message: string } | null>(null);

  const appendCompletedStep = (existingRemarks: string | undefined, step: number) => {
    const cleanRemarks = (existingRemarks || '').replace(/\[CRM_COMPLETED_STEP:\s*\d+\]/g, '').trim();
    return `${cleanRemarks}\n[CRM_COMPLETED_STEP: ${step}]`.trim();
  };

  const [wizardLeadData, setWizardLeadData] = useState({
    customer_name: '',
    mobile: '',
    whatsapp_number: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    Specify_Custom_Lead_Source_Name: '',
    client_residence_address: '',
    desired_event_shoot_type: '',
    // Step 2
    event_type: '',
    custom_event_name: '',
    event_name: '',
    event_shoot_type: '',
    event_date: '',
    event_start_date: '',
    event_end_date: '',
    event_time: '',
    reporting_time: '',
    event_location: '',
    guest_pax: "" as any,
    staff_pax: "" as any,
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
  const showValidationError = (fieldId: string, msg: string) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
      el.classList.add('!border-red-500', 'ring-1', '!ring-red-500');
      let msgEl = el.nextElementSibling as HTMLElement;
      if (!msgEl || !msgEl.classList.contains('validation-error-msg')) {
        msgEl = document.createElement('div');
        msgEl.className = 'validation-error-msg text-red-550 text-[10px] mt-1 font-bold animate-fade-in';
        el.parentNode?.insertBefore(msgEl, el.nextSibling);
      }
      msgEl.textContent = msg;
      
      const removeHighlight = () => {
        el.classList.remove('!border-red-500', 'ring-1', '!ring-red-500');
        if (msgEl && msgEl.parentNode) msgEl.parentNode.removeChild(msgEl);
        el.removeEventListener('input', removeHighlight);
        el.removeEventListener('change', removeHighlight);
      };
      el.addEventListener('input', removeHighlight);
      el.addEventListener('change', removeHighlight);
    } else {
      showToastMsg(msg, "error");
    }
  };

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setCrmToast({ message, type });
    setTimeout(() => setCrmToast(null), 3000);
  };

  React.useEffect(() => {
    if (crmToast) {
      const timer = setTimeout(() => {
        const el = document.getElementById('crm-toast-container') || document.getElementById('crm-create-toast-container');
        if (el) {
          const rect = el.getBoundingClientRect();
          const isInViewport = (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
          if (!isInViewport) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [crmToast]);

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

  // Step 2 Follow-up and Lost Lead states
  const [showStep2Popup, setShowStep2Popup] = useState(false);
  const [step2FollowUpDate, setStep2FollowUpDate] = useState('');
  const [step2FollowUpNotes, setStep2FollowUpNotes] = useState('');

  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('Price too high');
  const [lostNotes, setLostNotes] = useState('');
  const [otherLostReason, setOtherLostReason] = useState('');
  const [showCancelConfirmPopup, setShowCancelConfirmPopup] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    reason: string;
    source?: string;
    failedFunction?: string;
    database?: string;
    leadId?: string;
    suggestedFix?: string;
    stack?: string;
  } | null>(null);

  const showErrorHelper = (title: string, reason: string, failedFunction: string, leadId: string, suggestedFix: string, err?: any) => {
    console.error(`❌ ${title}\nReason: ${reason}\nFunction: ${failedFunction}\n`, err);
    setErrorDetails({
      title,
      reason: err?.message || reason,
      source: 'SalesModule.tsx',
      failedFunction,
      database: 'quotations / leads',
      leadId,
      suggestedFix,
      stack: err?.stack || ''
    });
  };

  const isLeadLocked = selectedLead ? isRecordLocked(selectedLead.lead_id, 'Sales') : false;

  const [openDropdownLeadId, setOpenDropdownLeadId] = useState<string | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number | string, right: number | string, bottom: number | string }>({ top: 0, right: 0, bottom: 'auto' });

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.actions-dropdown-container') && !target.closest('.actions-dropdown-menu')) {
        setOpenDropdownLeadId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

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
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState(false);
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
    event_name: string;
    event_shoot_type: string;
    event_date: string;
    event_start_date: string;
    event_end_date: string;
    event_time: string;
    event_location: string;
    guest_pax: number | '';
    staff_pax: number | '';
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
    event_name: '',
    event_shoot_type: '',
    event_date: '',
    event_start_date: '',
    event_end_date: '',
    event_time: '',
    event_location: '',
    guest_pax: "" as any,
    staff_pax: "" as any,
    budget: '',
    remarks: '',
    whatsapp_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    Specify_Custom_Lead_Source_Name: '',
    client_residence_address: '',
    desired_event_shoot_type: '',
    Select_Package_Option: '',
    total_pax: '',
    reference_source: '',
    lead_score: '',
    booking_status: '',
  });

  const [createEvents, setCreateEvents] = useState<LeadEvent[]>([]);
  const [crmEvents, setCrmEvents] = useState<LeadEvent[]>([]);
  const [collapsedEventIds, setCollapsedEventIds] = useState<Record<string, boolean>>({});
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState<Omit<LeadEvent, 'id'>>({
    event_type: '',
    event_name: '',
    event_shoot_type: '',
    event_date: '',
    event_start_time: '',
    event_end_time: '',
    event_location: '',
    google_maps_link: '',
    guest_pax: "" as any,
    staff_pax: "" as any,
    event_start_date: '',
    event_end_date: ''
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
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_date: '',
      event_end_date: '',
      event_time: '',
      event_location: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
      budget: '',
      remarks: '',
      whatsapp_number: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    Specify_Custom_Lead_Source_Name: '',
      client_residence_address: '',
      desired_event_shoot_type: '',
      Select_Package_Option: '',
      total_pax: '',
      reference_source: '',
      lead_value: '',
      lead_score: '',
      booking_status: '',
    });
    setCreateEvents([]);
    setWizardLeadData({
      customer_name: '',
      mobile: '',
      whatsapp_number: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    Specify_Custom_Lead_Source_Name: '',
      client_residence_address: '',
      desired_event_shoot_type: '',
      event_type: '',
      custom_event_name: '',
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_date: '',
      event_end_date: '',
      event_time: '',
      reporting_time: '',
      event_location: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
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
    setIsPackageSelectedAndSaved(false);
    setIsPackageDetailsSaved(false);
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
    setEventForm({
      event_type: '',
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_time: '',
      event_end_time: '',
      event_location: '',
      google_maps_link: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
      event_start_date: '',
      event_end_date: ''
    });
    setShowEventForm(false);
    setEditingEventId(null);
    setCollapsedEventIds({});
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

  // Body scroll lock effect when Create Lead modal is open (REMOVED to allow scrolling on smaller screens)
  React.useEffect(() => {
    // Body scroll lock removed to fix scrolling issues on smaller screens.
  }, [activeTab]);

  // Screen 3 Follow-Up Form State
  const [followUpForm, setFollowUpForm] = useState({
    call_notes: '',
    next_follow_up_date: '',
    status: 'Quote Follow-up' as CurrentStage,
    quotation_amount: 3500,
    negotiation_notes: '',
    event_date: '',
    event_time: '',
    reporting_time: '08:00',
    advance_received: 0,
    payment_mode: 'UPI',
    transaction_id: '',
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

  const [showFinalReportingModal, setShowFinalReportingModal] = useState(false);
  const [finalReportingForm, setFinalReportingForm] = useState<Record<string, { reporting_date: string, reporting_time: string }>>({});

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
  const [showStep3Popup, setShowStep3Popup] = useState<boolean>(false);
  const [step3Option, setStep3Option] = useState<'negotiation' | 'quotation_send'>('negotiation');

  // Customizable inclusions, deliverables, discount, and additional charges states
  const [editableInclusions, setEditableInclusions] = useState<Record<string, string[]>>({});
  const [editableDeliverables, setEditableDeliverables] = useState<Record<string, string[]>>({});
  
  const saveStep3DataRealtime = async (
    updatedInclusions: Record<string, string[]>,
    updatedDeliverables: Record<string, string[]>,
    activePkgId?: string
  ) => {
    const pkgId = activePkgId || wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;
    const leadId = selectedLead?.lead_id;
    if (!leadId || leadId === 'DRAFT-LEAD' || !pkgId || !supabaseClient) return;

    // Generate JSON for Team_Members based on updatedInclusions
    const inclusionsList = updatedInclusions[pkgId] || [];
    const teamMembersJson = (crmEvents && crmEvents.length > 0)
      ? crmEvents.map(event => {
          const eventKey = `${pkgId}_${event.id}`;
          const nameKey = `${pkgId}_${event.event_name || event.event_type || 'Unnamed Event'}`;
          const list = updatedInclusions[eventKey] !== undefined 
            ? updatedInclusions[eventKey] 
            : (updatedInclusions[nameKey] !== undefined ? updatedInclusions[nameKey] : inclusionsList);
          return {
            event_name: event.event_name || event.event_type || 'Unnamed Event',
            team_members: list.filter(Boolean)
          };
        })
      : [
          {
            event_name: "General",
            team_members: inclusionsList.filter(Boolean)
          }
        ];

    // Generate plain-text newline-separated list for deliverables_description based on updatedDeliverables
    const deliverablesList = updatedDeliverables[pkgId] || [];
    const deliverablesJson = deliverablesList.filter(Boolean);
    const deliverablesText = deliverablesJson.join('\n');

    const teamMembersText = JSON.stringify(teamMembersJson);

    try {
      // Always UPDATE the existing lead record
      const { error: updateError } = await supabaseClient
        .from('leads')
        .update({
          Team_Members: teamMembersText,
          deliverables_description: deliverablesText
        })
        .eq('lead_id', leadId);

      if (updateError) {
        console.error("Error updating leads table via saveStep3DataRealtime:", updateError);
      } else {
        // Update local React state to ensure 100% synchronization
        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            Team_Members: teamMembersText,
            deliverables_description: deliverablesText
          };
        });

        // Also sync wizardLeadData deliverables state
        setWizardLeadData(prev => ({
          ...prev,
          deliverables: deliverablesText,
          deliverables_description: deliverablesText
        }));
      }
    } catch (err) {
      console.error("Exception in saveStep3DataRealtime:", err);
    }
  };

  const getCleanSalesStaffName = (rawName?: any, leadObj?: Lead | null): string => {
    let candidate = String(rawName || '').trim();

    if (!candidate && leadObj) {
      if (leadObj.sales_staff_name && String(leadObj.sales_staff_name).trim()) {
        candidate = String(leadObj.sales_staff_name).trim();
      } else if (leadObj.sales_person && !['Sales', 'Sales Team', 'Admin', 'Admin User'].includes(String(leadObj.sales_person).trim())) {
        candidate = String(leadObj.sales_person).trim();
      }
    }

    if (!candidate) return '';

    // If candidate contains comma-separated names, extract only the actual Sales Person
    if (candidate.includes(',')) {
      if (leadObj?.sales_person && !['Sales', 'Sales Team', 'Admin', 'Admin User'].includes(String(leadObj.sales_person).trim())) {
        const sp = String(leadObj.sales_person).trim().toLowerCase();
        const parts = candidate.split(',').map(s => s.trim());
        const match = parts.find(p => p.toLowerCase() === sp || p.toLowerCase().includes(sp) || sp.includes(p.toLowerCase()));
        if (match) return match;
      }
      return candidate.split(',')[0].trim();
    }

    return candidate;
  };

  const getCleanSalesStaffMobile = (rawMobile?: any, leadObj?: Lead | null): string => {
    let candidate = String(rawMobile || '').trim();

    if (!candidate && leadObj && leadObj.sales_staff_mobile && String(leadObj.sales_staff_mobile).trim()) {
      candidate = String(leadObj.sales_staff_mobile).trim();
    }

    if (!candidate) return '';

    if (candidate.includes('||')) {
      candidate = candidate.split('||')[0].trim();
    }
    if (candidate.includes(',')) {
      candidate = candidate.split(',')[0].trim();
    }

    return candidate;
  };

  const [salesStaffName, setSalesStaffName] = useState<string>('');
  const [salesStaffMobile, setSalesStaffMobile] = useState<string>('');
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

  
  // Synchronize/initialize services on entering Step 4
  React.useEffect(() => {
    const isStep4Active = wizardStep === 3 || crmWizardStep === 3;
    if (!isStep4Active) {
      setEditingServiceId(null);
      setIsAddingInline(false);
      return;
    }

    const activePkgs = getSelectedPkgsInfo(crmWizardStep === 3);
    const activePkgIds = activePkgs.map(lp => lp.package_id).filter(Boolean);

    // Build expected list of base deliverables from active packages directly from packages table
    const expectedBaseDeliverables: { pkgId: string; name: string }[] = [];
    activePkgs.forEach((lp) => {
      const pkgKey = lp.package_id || 'default';
      const pObj = (packages || []).find(p => p.package_id === lp.package_id);
      const incStr = pObj?.team_members || '';
      const delStr = pObj?.deliverables || '';

      const inclusionsList = parseTeamMembers(incStr);
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

    const leadId = crmWizardStep === 3 ? (selectedLead?.lead_id || 'edit') : (createdLeadId || 'create');
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

      const inclusionsList = parseTeamMembers(incStr);
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
    const isStep4Active = wizardStep === 3 || crmWizardStep === 3;
    if (!isStep4Active) return;
    const leadId = crmWizardStep === 3 ? (selectedLead?.lead_id || 'edit') : (createdLeadId || 'create');
    localStorage.setItem(`erp_quote_services_${leadId}`, JSON.stringify(quoteServices));
  }, [quoteServices, selectedLead, createdLeadId, crmWizardStep, wizardStep]);

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

    setEditableInclusions(prev => {
      const newInclusions = { ...prev };
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
          changed = true;
        }
      } else {
        activePackages.forEach((lp) => {
          const pkgKey = lp.package_id || lp.lead_package_id || 'default';
          if (!newInclusions[pkgKey]) {
            const pObj = (packages || []).find(p => p.package_id === lp.package_id);
            const incStr = pObj?.team_members || lp.team_members || '';
            const parsedInc = parseTeamMembers(incStr);
            newInclusions[pkgKey] = parsedInc.length > 0
              ? parsedInc
              : [
                  '1 Candid Photographer',
                  '1 Cinematographer',
                  '2 Traditional Photographers',
                  '2 Traditional Videographers',
                  '1 Drone',
                  '1 LED Wall',
                  '1 Spot Mixing'
                ];
            changed = true;
          }
        });
      }
      return changed ? newInclusions : prev;
    });

    setEditableDeliverables(prev => {
      const newDeliverables = { ...prev };
      let changed = false;
      if (!hasActivePkgs) {
        const defaultId = `default_${selectedLead.lead_id}`;
        if (!newDeliverables[defaultId]) {
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
          if (!newDeliverables[pkgKey]) {
            const pObj = (packages || []).find(p => p.package_id === lp.package_id);
            const delStr = pObj?.deliverables || lp.deliverables || '';
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
      return changed ? newDeliverables : prev;
    });
  }, [selectedLead, leadPackages, packages]);

  // Auto-load package details into Step 3 if a package is selected but inclusions/deliverables are empty
  React.useEffect(() => {
    const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;
    if (pkgId && packages && packages.length > 0) {
      const pkg = packages.find((p) => String(p.package_id) === String(pkgId));
      if (pkg) {
        setEditableInclusions(prev => {
          let updated = { ...prev };
          let changed = false;
          const incList = parseTeamMembers(pkg.team_members);
          const defaultInc = incList.length > 0 ? incList : ['1 Professional Photographer'];
          
          if (!prev[pkgId] || prev[pkgId].length === 0) {
            updated[pkgId] = defaultInc;
            changed = true;
          }
          if (crmEvents && crmEvents.length > 0) {
            crmEvents.forEach(ev => {
              const key = `${pkgId}_${ev.id}`;
              if (!prev[key] || prev[key].length === 0) {
                updated[key] = [...defaultInc];
                changed = true;
              }
            });
          }
          return changed ? updated : prev;
        });

        setEditableDeliverables(prev => {
          let updated = { ...prev };
          let changed = false;
          const delList = pkg.deliverables
            ? pkg.deliverables.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
            : [];
          const defaultDel = delList.length > 0 ? delList : ['High Resolution Edited Photos'];

          if (!prev[pkgId] || prev[pkgId].length === 0) {
            updated[pkgId] = defaultDel;
            changed = true;
          }
          return changed ? updated : prev;
        });
      }
    }
  }, [wizardLeadData.selected_package_id, wizardLeadData.Select_Package_Option, packages, crmEvents]);

  const lastLoadedLeadIdRef = React.useRef<string | null>(null);

  // Fetch from Supabase directly for the JSON columns
  React.useEffect(() => {
    const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;
    if (selectedLead && selectedLead.lead_id && selectedLead.lead_id !== 'DRAFT-LEAD' && pkgId && supabaseClient) {
      if (lastLoadedLeadIdRef.current === selectedLead.lead_id) {
        return;
      }
      const fetchSupabasePackageData = async () => {
        try {
          const { data, error } = await supabaseClient
            .from('leads')
            .select('Team_Members, deliverables_description')
            .eq('lead_id', selectedLead.lead_id)
            .maybeSingle();
          
          if (!error && data) {
            lastLoadedLeadIdRef.current = selectedLead.lead_id;
            const newInclusions: Record<string, string[]> = {};
            const newDeliverables: Record<string, string[]> = {};

            if (data.Team_Members) {
              try {
                const parsedTeam = JSON.parse(data.Team_Members);
                if (Array.isArray(parsedTeam)) {
                  parsedTeam.forEach((item: any) => {
                    const eventName = item.event_name;
                    const members = Array.isArray(item.team_members) ? item.team_members : [];
                    if (eventName === 'General') {
                      newInclusions[pkgId] = members;
                    } else if (crmEvents && crmEvents.length > 0) {
                      const matchingEvent = crmEvents.find(e => 
                        (e.event_name || e.event_type || 'Unnamed Event') === eventName
                      );
                      if (matchingEvent) {
                        newInclusions[`${pkgId}_${matchingEvent.id}`] = members;
                        newInclusions[`${pkgId}_${eventName}`] = members;
                      } else {
                        newInclusions[`${pkgId}_${eventName}`] = members;
                      }
                    } else {
                      newInclusions[`${pkgId}_${eventName}`] = members;
                    }
                  });
                  setEditableInclusions(newInclusions);
                }
              } catch (e) {
                console.error('Error parsing Team_Members from leads:', e);
              }
            }

            if (data.deliverables_description) {
              try {
                const parsedDel = JSON.parse(data.deliverables_description);
                if (Array.isArray(parsedDel)) {
                  if (typeof parsedDel[0] === 'string') {
                    newDeliverables[pkgId] = parsedDel;
                  } else if (parsedDel[0] && Array.isArray(parsedDel[0].deliverables)) {
                    newDeliverables[pkgId] = parsedDel[0].deliverables;
                  }
                  setEditableDeliverables(newDeliverables);
                }
              } catch (e) {
                // Not JSON, handle as comma/newline separated list
                const delList = data.deliverables_description
                  ? data.deliverables_description.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
                  : [];
                if (delList.length > 0) {
                  newDeliverables[pkgId] = delList;
                  setEditableDeliverables(newDeliverables);
                }
              }
            }
          }
        } catch (e) {
          console.error('Error fetching leads details from Supabase', e);
        }
      };
      fetchSupabasePackageData();
    } else {
      if (!selectedLead) {
        lastLoadedLeadIdRef.current = null;
      }
    }
  }, [selectedLead?.lead_id, wizardLeadData.selected_package_id, wizardLeadData.Select_Package_Option, supabaseClient, crmEvents]);

  // Save to Supabase directly for the JSON columns
  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;
    if (selectedLead && selectedLead.lead_id && selectedLead.lead_id !== 'DRAFT-LEAD' && pkgId) {
      const updateDatabase = async () => {
        try {
          await saveStep3DataRealtime(editableInclusions, editableDeliverables);
        } catch (e) {
          console.error('Error updating lead_package via saveStep3DataRealtime', e);
        }
      };
      const timeoutId = setTimeout(() => {
        updateDatabase();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableDeliverables, editableInclusions, selectedLead?.lead_id, wizardLeadData.selected_package_id, wizardLeadData.Select_Package_Option]);

  // Step 1 Automatic Data Prefill & Hydration from Supabase leads table
  React.useEffect(() => {
    if (!selectedLead?.lead_id || !supabaseClient || selectedLead.lead_id === 'DRAFT-LEAD') return;

    let isMounted = true;

    const loadStep1DataFromDB = async () => {
      try {
        const { data: dbLead, error } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', selectedLead.lead_id)
          .maybeSingle();

        if (error || !dbLead || !isMounted) return;

        setWizardLeadData(prev => ({
          ...prev,
          customer_name: dbLead.customer_name || prev.customer_name || '',
          mobile: dbLead.mobile ? String(dbLead.mobile) : (prev.mobile ? String(prev.mobile) : ''),
          whatsapp_number: dbLead.whatsapp_number ? String(dbLead.whatsapp_number) : (dbLead.mobile ? String(dbLead.mobile) : (prev.whatsapp_number ? String(prev.whatsapp_number) : '')),
          email: dbLead.email ?? prev.email ?? '',
          lead_source: dbLead.lead_source || prev.lead_source || '',
          Specify_Custom_Lead_Source_Name: dbLead.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name || '',
          address: dbLead.address || prev.address || '',
          city: dbLead.city || prev.city || '',
          state: dbLead.state || prev.state || '',
          pincode: dbLead.pincode || prev.pincode || '',
          client_residence_address: dbLead.client_residence_address || prev.client_residence_address || '',
          desired_event_shoot_type: dbLead.desired_event_shoot_type || prev.desired_event_shoot_type || '',
          status: dbLead.status || dbLead.current_status || prev.status,
          budget: dbLead.budget ?? prev.budget ?? 0,
          package_price: dbLead.package_price ?? prev.package_price ?? 0,
          Select_Package_Option: dbLead.Select_Package_Option || prev.Select_Package_Option || '',
          selected_package_id: dbLead.Select_Package_Option || prev.selected_package_id || '',
        }));

        // Keep selectedLead object in sync with fresh database values
        setSelectedLead(prev => {
          if (!prev || prev.lead_id !== dbLead.lead_id) return prev;
          return {
            ...prev,
            customer_name: dbLead.customer_name || prev.customer_name,
            mobile: dbLead.mobile ? String(dbLead.mobile) : prev.mobile,
            whatsapp_number: dbLead.whatsapp_number ? String(dbLead.whatsapp_number) : prev.whatsapp_number,
            email: dbLead.email ?? prev.email,
            lead_source: dbLead.lead_source || prev.lead_source,
            Specify_Custom_Lead_Source_Name: dbLead.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name,
            status: dbLead.status || dbLead.current_status || prev.status,
          };
        });
      } catch (err) {
        console.error("Error loading Step 1 data from DB:", err);
      }
    };

    loadStep1DataFromDB();

    return () => { isMounted = false; };
  }, [selectedLead?.lead_id, supabaseClient]);

  // Step 1 Customer Details Automatic Data Hydration from Supabase
  React.useEffect(() => {
    if (!selectedLead?.lead_id || selectedLead.lead_id === 'DRAFT-LEAD' || !supabaseClient) return;

    let isMounted = true;

    const hydrateCustomerDetails = async () => {
      try {
        const { data: leadData, error } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', selectedLead.lead_id)
          .maybeSingle();

        if (error || !leadData || !isMounted) return;

        setWizardLeadData(prev => ({
          ...prev,
          customer_name: leadData.customer_name || prev.customer_name || selectedLead.customer_name || '',
          mobile: String(leadData.mobile || prev.mobile || selectedLead.mobile || ''),
          whatsapp_number: String(leadData.whatsapp_number || prev.whatsapp_number || leadData.mobile || prev.mobile || selectedLead.whatsapp_number || selectedLead.mobile || ''),
          email: leadData.email ?? prev.email ?? selectedLead.email ?? '',
          lead_source: leadData.lead_source || prev.lead_source || selectedLead.lead_source || 'Reference',
          Specify_Custom_Lead_Source_Name: leadData.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name || selectedLead.Specify_Custom_Lead_Source_Name || '',
          address: leadData.address || prev.address || selectedLead.address || '',
          city: leadData.city || prev.city || selectedLead.city || '',
          state: leadData.state || prev.state || selectedLead.state || '',
          pincode: leadData.pincode || prev.pincode || selectedLead.pincode || '',
          client_residence_address: leadData.client_residence_address || prev.client_residence_address || selectedLead.client_residence_address || '',
          desired_event_shoot_type: leadData.desired_event_shoot_type || prev.desired_event_shoot_type || selectedLead.desired_event_shoot_type || '',
          Select_Package_Option: leadData.Select_Package_Option || prev.Select_Package_Option || selectedLead.Select_Package_Option || '',
          status: leadData.status || leadData.current_status || prev.status || selectedLead.status || '',
        }));
      } catch (err) {
        console.warn("Failed to hydrate customer details from Supabase", err);
      }
    };

    hydrateCustomerDetails();

    return () => { isMounted = false; };
  }, [selectedLead?.lead_id, supabaseClient]);

  // Step 2 Automatic Data Persistence & Prefill
  React.useEffect(() => {
    const isStep2 = (activeTab === 'create' && wizardStep === 2) || (activeTab === 'crm' && crmWizardStep === 2);
    const activeLeadId = activeTab === 'create' ? createdLeadId : selectedLead?.lead_id;

    if (!isStep2 || !activeLeadId || !supabaseClient) return;

    let isMounted = true;

    const loadStep2DataFromDB = async () => {
      try {
        // 1. Fetch lead details
        const { data: leadData, error: leadErr } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', activeLeadId)
          .maybeSingle();

        if (leadErr) {
          console.error("Error fetching lead for step 2:", leadErr);
          return;
        }

        if (!isMounted) return;

        // 2. Fetch lead events
        const { data: eventsData, error: eventsErr } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', activeLeadId);

        if (eventsErr) {
          console.error("Error fetching events for step 2:", eventsErr);
          return;
        }

        if (!isMounted) return;

        if (leadData) {
          // Restore follow-up details
          if (leadData.next_follow_up_date) {
            setStep2FollowUpDate(leadData.next_follow_up_date);
          }
          if (leadData.follow_up_notes) {
            setStep2FollowUpNotes(leadData.follow_up_notes);
          }
          
          setWizardLeadData(prev => ({
            ...prev,
            lead_source: leadData.lead_source || prev.lead_source,
            Specify_Custom_Lead_Source_Name: leadData.Specify_Custom_Lead_Source_Name || prev.Specify_Custom_Lead_Source_Name,
            client_residence_address: leadData.client_residence_address || prev.client_residence_address,
            city: leadData.city || prev.city,
            state: leadData.state || prev.state,
            pincode: leadData.pincode || prev.pincode,
            reference_source: leadData.reference_source || prev.reference_source,
          }));
        }

        if (eventsData && eventsData.length > 0) {
          const mappedEvents: LeadEvent[] = eventsData.map(ev => ({
            id: ev.id,
            event_type: ev.event_type,
            event_name: ev.event_name,
            event_date: ev.event_date,
            event_start_date: ev.event_date,
            event_end_date: ev.event_end_date || ev.Event_End_Date || '',
            event_location: ev.event_location,
            event_shoot_type: ev.event_shoot_type,
            guest_pax: ev.guest_pax,
            staff_pax: ev.staff_pax,
            event_start_time: ev.event_start_time,
            event_end_time: ev.event_end_time,
            google_maps_link: ev.google_maps_link,
            assigned_staff_names: ev.assigned_staff_names,
            assigned_staff_mobiles: ev.assigned_staff_mobiles,
            reporting_date: ev.reporting_date,
            reporting_time: ev.reporting_time
          }));

          if (activeTab === 'create') {
            setCreateEvents(mappedEvents);
          } else {
            setCrmEvents(mappedEvents);
          }

          // Pre-fill the form with the first event's details
          const firstEv = mappedEvents[0];
          setEventForm({
            event_type: firstEv.event_type || '',
            event_name: firstEv.event_name || '',
            event_date: firstEv.event_date || '',
            event_start_date: firstEv.event_date || '',
            event_end_date: firstEv.event_end_date || (firstEv as any).Event_End_Date || '',
            event_location: firstEv.event_location || '',
            event_shoot_type: firstEv.event_shoot_type || '',
            guest_pax: firstEv.guest_pax || '',
            staff_pax: firstEv.staff_pax || '',
            event_start_time: firstEv.event_start_time || '',
            event_end_time: firstEv.event_end_time || '',
            google_maps_link: firstEv.google_maps_link || ''
          });
          setEditingEventId(firstEv.id);
          setShowEventForm(true); // Force form to display so fields are not blank
        }
      } catch (err) {
        console.error("Error in loadStep2DataFromDB effect:", err);
      }
    };

    loadStep2DataFromDB();

    return () => {
      isMounted = false;
    };
  }, [wizardStep, crmWizardStep, activeTab, createdLeadId, selectedLead?.lead_id, supabaseClient]);

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
      if (selectedLead) {
         setConfirmForm(prev => ({
            ...prev,
            quotation_amount: Number(selectedLead.Final_Quotation_Amount) || Number(selectedLead.final_amount) || 0
         }));
      }
    }
  }, [showConfirmModal, selectedLead]);

  React.useEffect(() => {
    if (showFinalReportingModal) {
      triggerAutoScrollAndFocus('#final_reporting_modal', 150);
    }
  }, [showFinalReportingModal]);

  React.useEffect(() => {
    if (showStep3Popup) {
      triggerAutoScrollAndFocus('#modal_step3_proceed_status', 150);
    }
  }, [showStep3Popup]);

  React.useEffect(() => {
    // Completely removed automated quotation number generation as per instructions
  }, [wizardStep, crmWizardStep, activeQuoteNum]);

  const getSelectedPkgsInfo = (isEdit: boolean) => {
  // ... inserted dynamically ...

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

  const dynamicBaseSum = getSelectedPkgsInfo(crmWizardStep > 0).reduce((sum, p) => sum + Number(p.package_cost || 0), 0);
  const dynamicAdditionalSum = quoteServices
    .filter(s => s.isAdditional)
    .reduce((sum, s) => sum + (Number(s.qty) * Number(s.price)), 0);
    const discountVal = Number(quoteDiscount || 0);
  const rawDynamicFinalAmt = Math.max(0, dynamicBaseSum + Number(quoteAdditional || 0) - discountVal);
  const dynamicFinalAmt = Number.isNaN(rawDynamicFinalAmt) ? 0 : rawDynamicFinalAmt;

  React.useEffect(() => {
    setWizardLeadData(prev => {
      if (prev.final_amount !== dynamicFinalAmt) {
        return { ...prev, final_amount: dynamicFinalAmt };
      }
      return prev;
    });
  }, [dynamicFinalAmt]);

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
        Select_Package_Option: wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option || '',
        sales_staff_name: salesStaffName,
        sales_staff_mobile: salesStaffMobile,
        events: crmEvents
      };
    } else {
      return {
        ...createForm,
        lead_id: createdLeadId || 'DRAFT-LEAD',
        deliverables_description: selectedPkgs.map(p => pkgDeliverables[p.id] || p.deliverables || 'N/A').join('\n'),
        notes_special_customizations: selectedPkgs.map(p => pkgNotes[p.id] || '').join('\n'),
        Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || '',
        sales_staff_name: salesStaffName,
        sales_staff_mobile: salesStaffMobile,
        events: createEvents
      };
    }
  };

  const validateLeadForQuotation = (leadObj: any, activePkgs: any[]) => {
    const missing: string[] = [];
    if (!String(leadObj.customer_name || '').trim()) missing.push('Customer Name');
    if (!String(leadObj.mobile || '').trim()) missing.push('Mobile Number');
    if (!String(leadObj.event_type || '').trim()) missing.push('Event Type');
    if (!String(leadObj.event_date || '').trim()) missing.push('Event Date');
    if (!String(leadObj.event_location || '').trim() && !String(leadObj.location || '').trim()) missing.push('Event Location');
    if (activePkgs.length === 0) missing.push('At least one selected package');
    return missing;
  };

  const handleGenerateQuote = async (isEdit: boolean): Promise<string | null> => {
    setIsSaving(true);
    console.log("✔ Starting quotation generation...");
    try {
      const leadObj = getLeadInfoForQuote(isEdit);
      const leadIdForError = leadObj?.lead_id || createdLeadId || 'UNKNOWN';

      if (!salesStaffName || !String(salesStaffName).trim()) {
        showValidationError("input_sales_staff_name", "Missing required field: Sales Staff Name");
        setIsSaving(false);
        return null;
      }
      const mobileVal = String(salesStaffMobile || '').trim();
      if (!salesStaffMobile || !mobileVal || mobileVal.length !== 10 || !/^\d+$/.test(mobileVal)) {
        showValidationError("input_sales_staff_mobile", "Invalid mobile number. Must be 10 digits.");
        setIsSaving(false);
        return null;
      }

      console.log("✔ Validating form...");
      const activePkgs = getSelectedPkgsInfo(isEdit);

      const missingFields = validateLeadForQuotation(leadObj, activePkgs);
      if (missingFields.length > 0) {
        showErrorHelper(
          "Quotation Incomplete",
          `Missing required fields: ${missingFields.join(', ')}`,
          "validateLeadForQuotation()",
          leadIdForError,
          "Complete all required fields before generating the quotation."
        );
        setIsSaving(false);
        return null;
      }

      const basePkgSum = dynamicBaseSum;
      const finalAmt = dynamicFinalAmt;

      const leadId = leadObj.lead_id || 'DRAFT-LEAD';
      let dbQuote = null;
      if (supabaseClient && leadId !== 'DRAFT-LEAD') {
        const { data, error } = await supabaseClient
          .from('quotations')
          .select('quotation_id, quotation_number, created_at')
          .eq('lead_id', leadId)
          .maybeSingle();
        if (!error && data) {
          dbQuote = data;
        }
      }

      const existingQuotation = dbQuote || (quotations || []).find(q => q.lead_id === leadId);
      
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const randomFour = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0');
      const generatedQuotNum = existingQuotation ? existingQuotation.quotation_number : `QT-${dateStr}-${randomFour}`;
      const quotNum = activeQuoteNum || generatedQuotNum;
      
      console.log(`✔ Creating/Updating quotation ${quotNum}...`);
      const qId = existingQuotation ? existingQuotation.quotation_id : ('QT-' + Math.random().toString(36).substring(2, 9).toUpperCase());
      
      const standardQuotation = {
        quotation_id: qId,
        quotation_number: quotNum,
        lead_id: leadId,
        customer_id: leadObj.customer_name || '',
        customer_name: leadObj.customer_name || '',
        order_id: '',
        package_name: activePkgs.map(p => p.package_name).join(' + '),
        package_price: basePkgSum,
        quotation_amount: basePkgSum + Number(quoteAdditional || 0),
        discount: quoteDiscount,
        discount_amount: quoteDiscount,
        additional_services_cost: Number(quoteAdditional || 0),
        final_quotation_amount: finalAmt,
        final_amount: finalAmt,
        tax_amount: 0,
        quotation_status: 'Sent',
        pdf_url: '',
        generated_date: new Date().toISOString().split('T')[0],
        created_at: existingQuotation ? existingQuotation.created_at : new Date().toISOString(),
        created_by: salesStaffName || 'System',
        whatsapp_sent_status: false,
        viewed_status: false,
        terms_conditions: quotationTerms,
        deliverables_description: leadObj.deliverables_description,
        notes_special_customizations: leadObj.notes_special_customizations,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
        client_residence_address: leadObj.client_residence_address,
        city: leadObj.city,
        state: leadObj.state,
        pincode: leadObj.pincode,
        desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,

        editableInclusions: editableInclusions,
        editableDeliverables: editableDeliverables
      };

      console.log("✔ Saving to Supabase...");
      const finalQuoteNum = await addQuotation(standardQuotation);
      console.log(`✔ Quotation saved successfully. Confirmed Quotation Number: ${finalQuoteNum}`);
      setActiveQuoteNum(finalQuoteNum);

      if (isEdit) {
        if (wizardLeadData.selected_package_id) {
          const selectedPkg = packages.find((p) => p.package_id === wizardLeadData.selected_package_id);
          const activePackagesList = (leadPackages || []).filter(lp => lp.lead_id === selectedLead.lead_id);
          
          if (!activePackagesList.some(lp => lp.package_id === wizardLeadData.selected_package_id)) {
            activePackagesList.push({
              package_id: wizardLeadData.selected_package_id,
              package_name: selectedPkg?.package_name || 'Selected Package',
              package_cost: Number(wizardLeadData.package_cost),
              quantity: 1,
              total_amount: Number(wizardLeadData.package_cost),
              discount: 0,
              final_amount: Number(wizardLeadData.package_cost),
              deliverables_description: wizardLeadData.deliverables,
              notes_special_customizations: wizardLeadData.notes,
              additional_services_cost: 0,
              team_members: '',
              deliverables: ''
            } as any);
          }
          
          const payloadToSave = activePackagesList.map(lp => {
            const isPrimary = lp.package_id === wizardLeadData.selected_package_id;
            const incStr = (editableInclusions[lp.package_id!] || []).join(', ');
            const delStr = (editableDeliverables[lp.package_id!] || []).join(', ');
            return {
              package_id: lp.package_id!,
              package_name: lp.package_name || 'Selected Package',
              package_cost: isPrimary ? Number(wizardLeadData.package_cost) : lp.package_cost,
              quantity: lp.quantity || 1,
              total_amount: isPrimary ? Number(wizardLeadData.package_cost) : lp.total_amount,
              discount: lp.discount || 0,
              final_amount: isPrimary ? Number(wizardLeadData.package_cost) : lp.final_amount,
              deliverables_description: isPrimary ? wizardLeadData.deliverables : lp.deliverables_description,
              notes_special_customizations: isPrimary ? wizardLeadData.notes : lp.notes_special_customizations,
              additional_services_cost: lp.additional_services_cost || 0,
              team_members: incStr || lp.team_members || '',
              deliverables: delStr || lp.deliverables || '',
              editable_inclusions: editableInclusions,
              editable_deliverables: editableDeliverables,
            };
          });

          await saveLeadPackages(selectedLead.lead_id, payloadToSave);
        }

        const updatedRemarks = appendCompletedStep(wizardLeadData.notes || '', 3);

        setWizardLeadData(prev => ({
          ...prev,
          budget: finalAmt,
          final_quoted_amount: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          remarks: updatedRemarks
        }));
        await updateLead(leadObj.lead_id, {
          budget: finalAmt,
          status: 'Quotation Sent' as CurrentStage,
          package_price: basePkgSum,
          deliverables_description: leadObj.deliverables_description,
          notes_special_customizations: leadObj.notes_special_customizations,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
          
          client_residence_address: leadObj.client_residence_address,
          city: leadObj.city,
          state: leadObj.state,
          pincode: leadObj.pincode,
          desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,
          remarks: updatedRemarks,
          Select_Package_Option: leadObj.Select_Package_Option || ''
        });
        
        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: 'Quotation Sent' as CurrentStage,
            remarks: updatedRemarks
          };
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
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalAmt,
          sales_staff_name: salesStaffName,
          sales_staff_mobile: salesStaffMobile,
          client_residence_address: leadObj.client_residence_address,
          city: leadObj.city,
          state: leadObj.state,
          pincode: leadObj.pincode,
          desired_event_shoot_type: leadObj.desired_event_shoot_type || leadObj.shoot_type,
          remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
          Select_Package_Option: leadObj.Select_Package_Option || ''
        });
      }

      console.log("✔ Process completed");
      return finalQuoteNum;
    } catch (err: any) {
      showErrorHelper(
        "Quotation Save Failed",
        err.message || "Failed to save quotation data to the database.",
        "handleGenerateQuote()",
        isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
        "Check your network connection and ensure the lead data is valid.",
        err
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewQuotePDF = async (isEdit: boolean) => {
    try {
      if (!salesStaffName || !String(salesStaffName).trim()) {
        showValidationError("input_sales_staff_name", "Quotation Incomplete! Please enter Sales Staff Name.");
        return;
      }
      const mobileVal = String(salesStaffMobile || '').trim();
      if (!salesStaffMobile || !mobileVal || mobileVal.length !== 10 || !/^\d+$/.test(mobileVal)) {
        showValidationError("input_sales_staff_mobile", "Please enter a valid 10-digit mobile number.");
        return;
      }

      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);

      const missingFields = validateLeadForQuotation(leadObj, activePkgs);
      if (missingFields.length > 0) {
        showToastMsg(`Quotation Incomplete! Please enter the following fields: ${missingFields.join(', ')}`, "error");
        return;
      }

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
        "",
        quotationTerms,
        currentLogo,
        currentAspect,
        editableInclusions,
        editableDeliverables,
        Number(quoteDiscount || 0),
        Number(quoteAdditional || 0),
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
      console.log("✔ Generating PDF...");
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);
      
      const doc = generateQuotationPDF(
        leadObj,
        activePkgs,
        "",
        quotationTerms,
        logoBase64,
        logoAspectRatio,
        editableInclusions,
        editableDeliverables,
        Number(quoteDiscount || 0),
        Number(quoteAdditional || 0),
        quoteServices
      );
      
      console.log("✔ PDF generated");
      doc.save(`Quotation.pdf`);
      
      showToastMsg("Quotation successfully generated!", "success");
    } catch (err: any) {
      showErrorHelper(
        "PDF Generation Failed",
        err.message || "jsPDF failed to render the quotation document.",
        "handleDownloadQuotePDF()",
        isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
        "Check console logs to see if there is an issue with the document template or variables.",
        err
      );
    }
  };

  const handleSendWhatsAppQuote = async (isEdit: boolean) => {
    try {
      console.log("✔ Generating PDF...");
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);
      const finalAmt = dynamicFinalAmt;

      const doc = generateQuotationPDF(
        leadObj,
        activePkgs,
        "",
        quotationTerms,
        logoBase64,
        logoAspectRatio,
        editableInclusions,
        editableDeliverables,
        Number(quoteDiscount || 0),
        Number(quoteAdditional || 0),
        quoteServices
      );
      
      console.log("✔ PDF generated");
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setGeneratedPDFBlobUrl(blobUrl);

      // Download the PDF automatically as requested
      doc.save(`Quotation.pdf`);

      console.log("✔ Opening WhatsApp...");
      const rawPhone = leadObj.whatsapp_number || leadObj.mobile || '';
      const phoneStr = typeof rawPhone === 'string' ? rawPhone : String(rawPhone);
      
      const safeCustomerName = String(leadObj.customer_name || '');
      const safeEventLocation = String(leadObj.event_location || leadObj.location || 'N/A');

      let eventDetailsStr = '';
      if (leadObj.events && leadObj.events.length > 0) {
        eventDetailsStr = leadObj.events.map((ev) => {
          const eName = ev.event_name || ev.event_type || 'Event';
          const eDate = ev.event_date || 'N/A';
          const eTime = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : '';
          return `🎉 ${eName}\n📅 Date: ${eDate}${eTime ? ` | Time: ${eTime}` : ''}`;
        }).join('\n\n') + '\n';
      } else {
        const safeEventType = String(leadObj.event_type || 'Event');
        const safeEventDate = String(leadObj.event_date || 'N/A');
        eventDetailsStr = `🎉 Event: ${safeEventType}\n📅 Event Date: ${safeEventDate}\n`;
      }

      const message = `Hello *${safeCustomerName}*,\n\n` +
        `Thank you for choosing *PhotoCrew Pictures*.\n\n` +
        `Please find your quotation details below:\n\n` +
        eventDetailsStr +
        `📍 Event Address: ${safeEventLocation}\n` +
        `💰 Final Amount: ₹${finalAmt.toLocaleString('en-IN')}\n\n` +
        `Thank you.\nPhotoCrew Pictures`;

      const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
      if (!cleanPhone) {
        showErrorHelper(
          "WhatsApp Redirect Failed",
          "Customer WhatsApp or mobile number is missing.",
          "handleSendWhatsAppQuote()",
          isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
          "Enter a valid mobile/WhatsApp number in Customer Details."
        );
        return;
      }
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');

      showToastMsg("Quotation downloaded and WhatsApp prepared!", "success");
      console.log("✔ Process completed");
    } catch (err: any) {
      showErrorHelper(
        "WhatsApp Redirect Failed",
        err.message || "Failed to prepare WhatsApp message or generate PDF.",
        "handleSendWhatsAppQuote()",
        isEdit && selectedLead ? selectedLead.lead_id : (createdLeadId || 'UNKNOWN'),
        "Check console logs to see if there is an issue with the document template or variables.",
        err
      );
    }
  };

  const handleSendEmailQuote = async (isEdit: boolean) => {
    try {
      const leadObj = getLeadInfoForQuote(isEdit);
      const activePkgs = getSelectedPkgsInfo(isEdit);
      const basePkgSum = dynamicBaseSum;
      const finalAmt = dynamicFinalAmt;
      
      const pkgNames = activePkgs.map(p => p.package_name).join(' + ') || 'Selected Package';
      const email = leadObj.email || '';
      
      const safeCustomerName = String(leadObj.customer_name || '');
      const safeEventType = String(leadObj.event_type || 'Event');

      const subject = `Photocrew Pictures - Custom Quotation Details`;
      const body = `Dear ${safeCustomerName},\n\n` +
        `Thank you for reach out to us! We are pleased to provide the custom quotation details for your upcoming ${safeEventType} shoot.\n\n` +
        `Selected Package: ${pkgNames}\n` +
        `Package Amount: Rs. ${basePkgSum.toLocaleString('en-IN')}\n` +
        `Discount Applied: Rs. ${(quoteDiscount || 0).toLocaleString('en-IN')}\n` +
        `Additional Services: Rs. ${(quoteAdditional || 0).toLocaleString('en-IN')}\n` +
        `Final Quotation Amount: Rs. ${finalAmt.toLocaleString('en-IN')}\n\n` +
        `We will follow up shortly to discuss any specific adjustments you might need.\n\n` +
        `Warm regards,\n` +
        `The Photocrew Pictures Team\n` +
        `https://www.photocrewpictures.com/`;

      window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
    } catch (err: any) {
      showToastMsg("Failed to open email client.", "error");
    }
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
        {/* Section 2: Quotation Details */}
        <div className="bg-slate-900/50 border border-slate-805/40 rounded-xl p-4.5 space-y-3.5 shadow-sm">
          <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wide font-mono flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <span>📋</span> Section 2: Quotation Details
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Extra Charges */}

          </div>

          {/* Final Calculated Amount Badge */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between shadow-inner mt-2">
            <div className="space-y-0.5">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide font-mono">Final Quotation Amount</p>
              <p className="text-[9px] text-slate-500 font-mono">Formula: Base Price (₹{basePkgSum}) + Addl (₹{quoteAdditional || 0}) - Disc (₹{quoteDiscount || 0})</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-amber-500 font-mono">
                ₹{finalAmt.toLocaleString('en-IN')}
              </span>
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
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded-lg transition-all border border-red-900/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>📄</span> {isSaving ? 'Processing...' : 'Download PDF Document'}
            </button>

            {/* Send WhatsApp */}
            <button
              type="button"
              onClick={() => handleSendWhatsAppQuote(isEdit)}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 rounded-lg transition-all border border-emerald-900/40 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>💬</span> {isSaving ? 'Processing...' : 'Send Quotation via WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    let isMounted = true;

    const fetchReportingData = async () => {
       if (!selectedLead?.lead_id) return;
       try {
          if (!supabaseClient) return;
          const { data, error } = await supabaseClient
             .from('order_event_reporting')
             .select('*')
             .eq('lead_id', selectedLead.lead_id);
          
          if (error) {
             console.error("Failed to load order_event_reporting data", error);
             return;
          }

          if (isMounted && data && data.length > 0) {
             const first = data[0];
             setWizardLeadData(prev => ({
                ...prev,
                confirmed_event_date: first.confirmed_event_date || prev.confirmed_event_date,
                confirmed_event_time: first.confirmed_event_time || prev.confirmed_event_time,
                final_amount: first.contract_final_amount || prev.final_amount,
                advance_received: first.advance_payment_received || prev.advance_received,
             }));

             setCrmEvents(prev => prev.map(ev => {
                const rep = data.find(r => r.event_id === ev.id);
                if (rep) {
                   return {
                      ...ev,
                      reporting_date: rep.reporting_date || ev.reporting_date,
                      reporting_time: rep.reporting_time || ev.reporting_time
                   };
                }
                return ev;
             }));
          }
       } catch (err) {
          console.error("Error loading reporting data", err);
       }
    };

    fetchReportingData();
    
    return () => { isMounted = false; };
  }, [selectedLead?.lead_id, supabaseClient]);

  // Sync wizardLeadData.advance_received and wizardLeadData.final_amount with latest payment and order confirmation data
  React.useEffect(() => {
    if (!selectedLead?.lead_id) return;
    const linkedOrder = orders?.find(o => o.lead_id === selectedLead.lead_id);
    const linkedPayment = linkedOrder ? payments?.find(p => p.order_id === linkedOrder.order_id) : null;
    
    if (linkedOrder || linkedPayment) {
      setWizardLeadData(prev => {
        const latestAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : prev.advance_received);
        const latestFinalAmount = linkedOrder ? (linkedOrder.quotation_amount || 0) : prev.final_amount;
        
        if (prev.advance_received !== latestAdvance || prev.final_amount !== latestFinalAmount) {
          return {
            ...prev,
            advance_received: latestAdvance,
            final_amount: latestFinalAmount
          };
        }
        return prev;
      });
    }
  }, [selectedLead?.lead_id, orders, payments]);

  // Handle lead select
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail.role === 'sales' || e.detail.role === 'owner') {
        const targetLead = leads.find(l => l.lead_id === e.detail.leadId || l.order_id === e.detail.orderId);
        if (targetLead) {
          if (externalSetActiveTab) externalSetActiveTab('list'); else setInternalTab('list');
          handleSelectLead(targetLead);
        }
      }
    };
    window.addEventListener('calendar-action-click-deferred', handler);
    return () => window.removeEventListener('calendar-action-click-deferred', handler);
  }, [leads]);
  
  const handleSelectLead = async (lead: Lead) => {
    let fullLead = lead;
    if (supabaseClient && lead.lead_id && lead.lead_id !== 'DRAFT-LEAD') {
      try {
        const { data: dbLead, error: dbLeadErr } = await supabaseClient
          .from('leads')
          .select('*')
          .eq('lead_id', lead.lead_id)
          .maybeSingle();
        
        if (!dbLeadErr && dbLead) {
          fullLead = { ...lead, ...dbLead };
        }
      } catch (err) {
        console.warn("Failed to fetch full lead details on select", err);
      }
    }

    setSelectedLead(fullLead);
    setCrmEvents(fullLead.events || []);

    // Always fetch fresh events to ensure no cached EV- IDs are used
    if (supabaseClient && fullLead.lead_id && fullLead.lead_id !== 'DRAFT-LEAD') {
      try {
        const { data: freshEvents, error } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', fullLead.lead_id)
          .order('created_at', { ascending: true });
        
        if (!error && freshEvents && freshEvents.length > 0) {
          setCrmEvents(freshEvents as LeadEvent[]);
          setSelectedLead(prev => prev ? { ...prev, events: freshEvents as LeadEvent[] } : prev);
        }
      } catch (err) {
        console.warn("Failed to load fresh events on selection", err);
      }
    }

    setGeneratedPDFBlobUrl('');
    setActiveQuoteNum('');
    setQuoteDiscount(0);
    setQuoteAdditional(0);
    // Explicitly reset on new lead selection
    setEditableInclusions({});
    setEditableDeliverables({});
    // Clean and set Sales Executive Details (isolated from Operations/Production staff on events)
    const initialSalesStaffName = getCleanSalesStaffName(lead.sales_staff_name, lead);
    const initialSalesStaffMobile = getCleanSalesStaffMobile(lead.sales_staff_mobile, lead);
    setSalesStaffName(initialSalesStaffName);
    setSalesStaffMobile(initialSalesStaffMobile);

    const activePackages = (leadPackages || []).filter(lp => lp.lead_id === lead.lead_id);
    const primaryLP = activePackages[0];
    
    // Find the latest quotation for this lead if it exists
    const latestQuote = [...(quotations || [])]
      .filter(q => q.lead_id === lead.lead_id)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];

    // Determine the target CRM step based on persisted data and status
    const hasQuotationOrPackage = !!(
      latestQuote ||
      primaryLP?.package_id ||
      (fullLead.Select_Package_Option && String(fullLead.Select_Package_Option).trim() !== '') ||
      ['Quotation Sent', 'Negotiation', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed', 'Lost Lead'].includes(fullLead.status || '') ||
      ['Quotation Sent', 'Negotiation', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Closed', 'Lost Lead'].includes((fullLead as any).current_status || '')
    );

    const hasEventDetails = !!(
      (fullLead.events && fullLead.events.length > 0) ||
      (fullLead.event_type && String(fullLead.event_type).trim() !== '') ||
      (fullLead.event_date && String(fullLead.event_date).trim() !== '') ||
      (fullLead.event_location && String(fullLead.event_location).trim() !== '') ||
      (fullLead.desired_event_shoot_type && String(fullLead.desired_event_shoot_type).trim() !== '')
    );

    const hasCustomerDetails = !!(
      (fullLead.customer_name && String(fullLead.customer_name).trim() !== '') ||
      (fullLead.mobile && String(fullLead.mobile).trim() !== '')
    );

    const localSavedStep = localStorage.getItem(`crm_last_step_${lead.lead_id}`);
    const remarksMatch = fullLead.remarks?.match(/\[CRM_COMPLETED_STEP:\s*(\d+)\]/);
    const explicitStep = localSavedStep ? parseInt(localSavedStep, 10) : (remarksMatch ? parseInt(remarksMatch[1], 10) : null);

    let startStep = 1;
    if (hasQuotationOrPackage || explicitStep === 3) {
      startStep = 3;
    } else if (hasEventDetails || explicitStep === 2) {
      startStep = 2;
    } else if (hasCustomerDetails || explicitStep === 1) {
      startStep = 2; // Step 1 completed, proceed to Step 2
    } else {
      startStep = 1;
    }

    const completedStep = Math.max(startStep, explicitStep || 1);
    setCrmHighestStep(completedStep);
    setCrmWizardStep(startStep);
    
    const hasPackageAnywhere = !!(lead.Select_Package_Option || primaryLP?.package_id || latestQuote?.package_id);
    if (completedStep >= 3 || hasPackageAnywhere) {
      setIsPackageSelectedAndSaved(true);
      setIsPackageDetailsSaved(true);
    } else {
      setIsPackageSelectedAndSaved(false);
      setIsPackageDetailsSaved(false);
    }

    setQuoteDiscount(lead.Quotation_Discount ?? latestQuote?.discount_amount ?? 0);
    setQuoteAdditional(lead.Additional_Services_Cost ?? latestQuote?.additional_services_cost ?? 0);
    if (latestQuote) {
      setActiveQuoteNum(latestQuote.quotation_number || '');
      const quoteSalesName = getCleanSalesStaffName(latestQuote.sales_staff_name || lead.sales_staff_name, lead);
      const quoteSalesMobile = getCleanSalesStaffMobile(latestQuote.sales_staff_mobile || lead.sales_staff_mobile, lead);
      setSalesStaffName(quoteSalesName);
      setSalesStaffMobile(quoteSalesMobile);
    }

    const matchedPkgId = latestQuote?.package_id || primaryLP?.package_id || lead.Select_Package_Option || '';
    const matchedPkg = (packages || []).find(p => p.package_id === matchedPkgId);

    // Load deliverables from leads.deliverables_description directly to prevent stale/cached data
    if (matchedPkgId && lead.deliverables_description) {
      const newDeliverables: Record<string, string[]> = {};
      try {
        const parsedDel = JSON.parse(lead.deliverables_description);
        if (Array.isArray(parsedDel)) {
          if (typeof parsedDel[0] === 'string') {
            newDeliverables[matchedPkgId] = parsedDel;
          } else if (parsedDel[0] && Array.isArray(parsedDel[0].deliverables)) {
            newDeliverables[matchedPkgId] = parsedDel[0].deliverables;
          } else {
            newDeliverables[matchedPkgId] = [];
          }
        } else {
          newDeliverables[matchedPkgId] = [];
        }
      } catch (e) {
        // Fallback if not JSON (e.g. newline-separated text)
        const delList = lead.deliverables_description
          ? lead.deliverables_description.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
          : [];
        newDeliverables[matchedPkgId] = delList;
      }
      setEditableDeliverables(newDeliverables);
    } else {
      if (latestQuote?.editableDeliverables) {
        setEditableDeliverables(latestQuote.editableDeliverables);
      } else if (primaryLP?.editable_deliverables) {
        setEditableDeliverables(primaryLP.editable_deliverables);
      } else {
        setEditableDeliverables({});
      }
    }

    // Load team members from leads.Team_Members directly to prevent stale/cached data
    if (matchedPkgId && lead.Team_Members) {
      try {
        const parsedTeam = JSON.parse(lead.Team_Members);
        if (Array.isArray(parsedTeam)) {
          const newInclusions: Record<string, string[]> = {};
          parsedTeam.forEach((item: any) => {
            const eventName = item.event_name;
            const members = Array.isArray(item.team_members) ? item.team_members : [];
            if (eventName === 'General') {
              newInclusions[matchedPkgId] = members;
            } else if (lead.events && lead.events.length > 0) {
              const matchingEvent = lead.events.find(e => 
                (e.event_name || e.event_type || 'Unnamed Event') === eventName
              );
              if (matchingEvent) {
                newInclusions[`${matchedPkgId}_${matchingEvent.id}`] = members;
              } else {
                newInclusions[`${matchedPkgId}_${eventName}`] = members;
              }
            } else {
              newInclusions[`${matchedPkgId}_${eventName}`] = members;
            }
          });
          setEditableInclusions(newInclusions);
        } else {
          setEditableInclusions({});
        }
      } catch (e) {
        console.error('Error parsing Team_Members from leads in handleSelectLead:', e);
        setEditableInclusions({});
      }
    } else {
      if (latestQuote?.editableInclusions) {
        setEditableInclusions(latestQuote.editableInclusions);
      } else if (primaryLP?.editable_inclusions) {
        setEditableInclusions(primaryLP.editable_inclusions);
      } else {
        setEditableInclusions({});
      }
    }

    const firstEvent = fullLead.events && fullLead.events.length > 0 ? fullLead.events[0] : null;
    const evName = firstEvent?.event_name || fullLead.custom_event_name || '';
    const evShootType = firstEvent?.event_shoot_type || fullLead.desired_event_shoot_type || fullLead.shoot_type || '';
    const evDate = firstEvent?.event_date || fullLead.event_date || '';
    const evStartDate = firstEvent?.event_start_date || fullLead.event_date || '';
    const evEndDate = firstEvent?.event_end_date || (firstEvent as any)?.Event_End_Date || fullLead.Event_End_Date || '';
    const evLocation = firstEvent?.event_location || fullLead.event_location || '';
    const evGuestPax = firstEvent?.guest_pax ?? fullLead.guest_pax ?? fullLead.total_pax ?? '';
    const evStaffPax = firstEvent?.staff_pax ?? fullLead.staff_pax ?? '';
    setInternalNotes(fullLead.follow_up_notes || '');
    setFollowUpDate(fullLead.next_follow_up_date || '');
    setWizardLeadData({
      customer_name: fullLead.customer_name || '',
      mobile: fullLead.mobile ? String(fullLead.mobile) : '',
      whatsapp_number: fullLead.whatsapp_number ? String(fullLead.whatsapp_number) : (fullLead.mobile ? String(fullLead.mobile) : ''),
      email: fullLead.email || '',
      address: fullLead.address || '',
      city: latestQuote?.city || fullLead.city || '',
      state: latestQuote?.state || fullLead.state || '',
      pincode: latestQuote?.pincode || fullLead.pincode || '',
      client_residence_address: latestQuote?.client_residence_address || fullLead.client_residence_address || '',
      desired_event_shoot_type: latestQuote?.desired_event_shoot_type || fullLead.desired_event_shoot_type || '',
      Select_Package_Option: fullLead.Select_Package_Option || latestQuote?.Select_Package_Option || primaryLP?.package_id || '',
      // Step 2
      event_type: fullLead.event_type || '',
      custom_event_name: fullLead.custom_event_name || '',
      event_name: evName,
      event_shoot_type: evShootType,
      event_date: evDate,
      event_start_date: evStartDate,
      event_end_date: evEndDate,
      event_time: fullLead.event_time || '',
      reporting_time: fullLead.reporting_time || '',
      event_location: evLocation,
      guest_pax: evGuestPax,
      staff_pax: evStaffPax,
      lead_source: fullLead.lead_source || '',
      Specify_Custom_Lead_Source_Name: fullLead.Specify_Custom_Lead_Source_Name || '',
      shoot_type: evShootType,
      // Step 3
      selected_package_id: latestQuote?.package_id || primaryLP?.package_id || fullLead.Select_Package_Option || '',
      package_cost: fullLead.package_price || latestQuote?.package_price || (primaryLP ? Number(primaryLP.package_cost) : (matchedPkg ? Number(matchedPkg.price) : 0)),
      package_price: fullLead.package_price || latestQuote?.package_price || (primaryLP ? Number(primaryLP.package_cost) : (matchedPkg ? Number(matchedPkg.price) : 0)),
      deliverables: latestQuote?.deliverables_description || primaryLP?.deliverables_description || matchedPkg?.deliverables || '',
      deliverables_description: latestQuote?.deliverables_description || primaryLP?.deliverables_description || matchedPkg?.deliverables || '',
      notes_special_customizations: latestQuote?.notes_special_customizations || primaryLP?.notes_special_customizations || '',
      notes: fullLead.remarks || '',
      // Step 4
      budget: latestQuote?.quotation_amount || fullLead.budget || 0,
      final_quoted_amount: latestQuote?.final_amount || (primaryLP ? Number(primaryLP.final_amount) : 0),
      remarks: fullLead.remarks || '',
      next_follow_up_date: '',
      // Step 5
      status: fullLead.status || 'New Lead',
      // Order Confirmed Rule fields
      confirmed_event_date: fullLead.booking_date || fullLead.event_date || '',
      confirmed_event_time: fullLead.booking_time || fullLead.event_time || '',
      final_amount: fullLead.final_package_amount || fullLead.Final_Quotation_Amount || 0,
      advance_received: fullLead.advance_collected || 0,
      total_pax: fullLead.total_pax || 0,
      reference_source: fullLead.reference_source || '',
      lead_value: fullLead.lead_value || 0,
      lead_score: fullLead.lead_score || 0,
      booking_status: fullLead.booking_status || 'Pending',
    });

    setFollowUpForm({
      call_notes: lead.follow_up_notes || '',
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
      package_name: packages?.find((p) => String(p.package_id) === String(lead.Select_Package_Option))?.package_name || lead.Select_Package_Option || '',
      quotation_amount: Number(lead.Final_Quotation_Amount) || Number((lead as any).final_amount) || 0,
      advance_received: 0,
      event_date: lead.event_date || '',
      event_time: lead.event_time || '',
      payment_mode: 'UPI',
      notes: '',
    });
  };

  const handlePackageChange = (packageId: string) => {
    setIsPackageSelectedAndSaved(true);
    setIsPackageDetailsSaved(true);
    const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
    const pkg = availablePkgs.find((p) => String(p.package_id) === String(packageId));
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
      
      const incList = parseTeamMembers(pkg.team_members);
      const defaultInc = incList.length > 0 ? incList : ['1 Professional Photographer'];
      
      const delList = pkg.deliverables
        ? pkg.deliverables.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
        : [];
      const defaultDel = delList.length > 0 ? delList : ['High Resolution Edited Photos'];

      const newInclusions = { ...editableInclusions };
      newInclusions[packageId] = defaultInc;
      
      if (crmEvents && crmEvents.length > 0) {
        crmEvents.forEach((ev) => {
          newInclusions[`${packageId}_${ev.id}`] = [...defaultInc];
          newInclusions[`${packageId}_${ev.event_name || ev.event_type || 'Unnamed Event'}`] = [...defaultInc];
        });
      }

      const newDeliverables = { ...editableDeliverables };
      newDeliverables[packageId] = defaultDel;

      setEditableInclusions(newInclusions);
      setEditableDeliverables(newDeliverables);

      // Immediately save the selected package with default inclusions and deliverables to Supabase
      saveStep3DataRealtime(newInclusions, newDeliverables, packageId);
    } else {
      setWizardLeadData((prev) => ({
        ...prev,
        selected_package_id: '',
        Select_Package_Option: '',
      }));
    }
  };

  const validateStep3Data = (mode: 'package' | 'all'): boolean => {
    // Validate package selection
    const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;
    if (!pkgId || pkgId.trim() === '') {
      showValidationError("select_package_option", "Please select a package before continuing.");
      showToastMsg("❌ Please complete all required fields before saving the package.", "error");
      return false;
    }

    // Validate Sales Executive details
    if (!salesStaffName || !String(salesStaffName).trim()) {
      showValidationError("input_sales_staff_name", "Please enter Sales Staff Name.");
      showToastMsg("❌ Please complete all required fields before saving the package.", "error");
      return false;
    }

    const mobileVal = String(salesStaffMobile || '').trim();
    if (!mobileVal || mobileVal.length !== 10 || !/^\d+$/.test(mobileVal)) {
      showValidationError("input_sales_staff_mobile", "Please enter a valid 10-digit Sales Staff Mobile Number.");
      showToastMsg("❌ Please complete all required fields before saving the package.", "error");
      return false;
    }

    if (mode === 'all') {
      if (wizardLeadData.status === 'Order Confirmed') {
        if (!wizardLeadData.confirmed_event_date) {
          showValidationError("input_confirmed_event_date", "Please provide Confirmed Event Date.");
          showToastMsg("❌ Please complete all required fields before saving.", "error");
          return false;
        }

        if (wizardLeadData.final_amount === undefined || wizardLeadData.final_amount === null || isNaN(wizardLeadData.final_amount) || wizardLeadData.final_amount <= 0) {
          showValidationError("input_final_amount", "Please provide Final Amount.");
          showToastMsg("❌ Please complete all required fields before saving.", "error");
          return false;
        }
        if (wizardLeadData.advance_received === undefined || wizardLeadData.advance_received === null || isNaN(wizardLeadData.advance_received)) {
          showValidationError("input_advance_received", "Please provide Advance Payment Received.");
          showToastMsg("❌ Please complete all required fields before saving.", "error");
          return false;
        }

        if (crmEvents && crmEvents.length > 0) {
          for (const ev of crmEvents) {
            const rDate = ev.reporting_date || ev.event_date || wizardLeadData.confirmed_event_date;
            if (!rDate) {
              showValidationError(`reporting_date_${ev.id}`, "Reporting Date is required.");
              showToastMsg("❌ Please complete all required fields before saving.", "error");
              return false;
            }
            if (!ev.reporting_time) {
              showValidationError(`reporting_time_${ev.id}`, "Reporting Time is required.");
              showToastMsg("❌ Please complete all required fields before saving.", "error");
              return false;
            }
          }
        }
      }
    }

    return true;
  };

  const handleSavePackageOnly = async () => {
    if (!selectedLead || isSaving) return;
    setIsSaving(true);
    try {
      // 1. Perform unified validation
      if (!validateStep3Data('package')) {
        setIsSaving(false);
        return;
      }

      const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;

      // 2. Perform the full save of lead_packages to Supabase using our robust real-time save logic
      await saveStep3DataRealtime(editableInclusions, editableDeliverables);

      // 3. Update the lead record in Supabase with latest Step 3 package / pricing / staff info
      const updatedRemarks = appendCompletedStep(wizardLeadData.notes || '', 3);
      
      const updatedEvents = crmEvents.map(ev => ({
        ...ev,
        assigned_staff_names: ev.assigned_staff_names || '',
        assigned_staff_mobiles: ev.assigned_staff_mobiles || ''
      }));

      await updateLead(selectedLead.lead_id, {
        budget: Number(wizardLeadData.package_cost),
        package_price: Number(wizardLeadData.package_cost),
        deliverables_description: wizardLeadData.deliverables,
        notes_special_customizations: wizardLeadData.notes,
        remarks: updatedRemarks,
        Select_Package_Option: pkgId,
        sales_staff_name: salesStaffName,
        sales_staff_mobile: salesStaffMobile,
        Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
        Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
        Final_Quotation_Amount: Math.max(0, Number(wizardLeadData.package_cost) + Number(quoteAdditional || 0) - Number(quoteDiscount || 0)),
        events: updatedEvents
      });

      // Update the local selectedLead state so that the UI reflects it
      setSelectedLead(prev => {
        if (!prev) return null;
        return {
          ...prev,
          budget: Number(wizardLeadData.package_cost),
          package_price: Number(wizardLeadData.package_cost),
          deliverables_description: wizardLeadData.deliverables,
          notes_special_customizations: wizardLeadData.notes,
          remarks: updatedRemarks,
          Select_Package_Option: pkgId,
          sales_staff_name: salesStaffName,
          sales_staff_mobile: salesStaffMobile,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: Math.max(0, Number(wizardLeadData.package_cost) + Number(quoteAdditional || 0) - Number(quoteDiscount || 0)),
        };
      });

      setIsPackageDetailsSaved(true);
      showToastMsg("✅ Package saved successfully.", "success");
    } catch (err: any) {
      console.error("Save package only failed:", err);
      setSaveErrorPopup({
        title: "Failed to save package",
        message: "❌ Failed to save package.\nPlease try again."
      });
    } finally {
      setIsSaving(false);
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
        const mobileVal = String(wizardLeadData.mobile || '').trim();
        if (!/^\d{10}$/.test(mobileVal)) {
          showToastMsg("Please enter a valid 10-digit mobile number.", "error");
          setIsSaving(false);
          return;
        }
        if (!wizardLeadData.lead_source) {
          showToastMsg("Lead Source is required.", "error");
          setIsSaving(false);
          return;
        }
        const updatedRemarks = appendCompletedStep(selectedLead.remarks || wizardLeadData.remarks, 1);
        await updateLead(selectedLead.lead_id, {
          customer_name: wizardLeadData.customer_name || '',
          mobile: wizardLeadData.mobile,
          whatsapp_number: wizardLeadData.whatsapp_number,
          email: wizardLeadData.email,
          address: wizardLeadData.address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode,
          client_residence_address: wizardLeadData.client_residence_address,
          lead_source: wizardLeadData.lead_source,
          Specify_Custom_Lead_Source_Name: wizardLeadData.lead_source === 'Other' && wizardLeadData.Specify_Custom_Lead_Source_Name?.trim() !== '' ? wizardLeadData.Specify_Custom_Lead_Source_Name.trim() : null,
          total_pax: wizardLeadData.total_pax,
          reference_source: wizardLeadData.reference_source,
          Select_Package_Option: wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || '',
          remarks: updatedRemarks,
          status: selectedLead.status || 'New Lead'
        });

        const newCompleted = Math.max(crmHighestStep, 1);
        setCrmHighestStep(newCompleted);
        localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));

        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            remarks: updatedRemarks
          };
        });

        showToastMsg("CRM Updated Successfully.", "success");
      } else if (step === 2) {
        let finalEventsList = [...crmEvents];

        if (showEventForm || finalEventsList.length === 0) {
          if (!eventForm.event_type || eventForm.event_type === '') {
            showToastMsg("Please select Event Type.", "error");
            setIsSaving(false);
            return;
          }
          if (!eventForm.event_date || eventForm.event_date === '') {
            showToastMsg("Please select Event Date.", "error");
            setIsSaving(false);
            return;
          }
          if (!eventForm.event_location || eventForm.event_location.trim() === '') {
            showToastMsg("Please enter Event Location.", "error");
            setIsSaving(false);
            return;
          }

          if (isEventDateTimeInvalid(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time)) {
            showToastMsg("Event End Date & Time must be later than Event Start Date & Time.", "error");
            setIsSaving(false);
            return;
          }

          const guestPaxVal = eventForm.guest_pax !== '' ? Math.max(0, parseInt(String(eventForm.guest_pax)) || 0) : '';
          const staffPaxVal = eventForm.staff_pax !== '' ? Math.max(0, parseInt(String(eventForm.staff_pax)) || 0) : '';

          const eventData = {
            ...eventForm,
            guest_pax: guestPaxVal,
            staff_pax: staffPaxVal,
            event_start_date: eventForm.event_date,
            event_end_date: eventForm.event_end_date || ''
          };

          if (editingEventId) {
            finalEventsList = finalEventsList.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev);
          } else {
            finalEventsList.push({
              ...eventData,
              id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
            });
          }

          setCrmEvents(finalEventsList);
          setEditingEventId(null);
          setShowEventForm(false);
        }

        if (finalEventsList.length === 0) {
          showToastMsg("Please add at least one event.", "error");
          setIsSaving(false);
          return;
        }

        // Pre-validate and format all events in the finalEventsList
        for (const ev of finalEventsList) {
          try {
            ev.event_start_time = validateAndFormatTime(ev.event_start_time, "Event Start Time") || '';
          } catch (err: any) {
            showToastMsg(err.message, "error");
            setIsSaving(false);
            return;
          }
          try {
            ev.event_end_time = validateAndFormatTime(ev.event_end_time, "Event End Time") || '';
          } catch (err: any) {
            showToastMsg(err.message, "error");
            setIsSaving(false);
            return;
          }
        }


        // Open Step 2 Follow-up details modal before moving to Step 3
        const currentId = selectedLead?.lead_id;
        const savedDate = currentId ? (localStorage.getItem(`follow_up_date_${currentId}`) || selectedLead?.next_follow_up_date || '') : '';
        const savedNotes = currentId ? (localStorage.getItem(`follow_up_notes_${currentId}`) || selectedLead?.follow_up_notes || '') : '';
        setStep2FollowUpDate(savedDate);
        setStep2FollowUpNotes(savedNotes);
        setShowStep2Popup(true);
        setIsSaving(false);
        return; // Halt here. The rest of the Step 2 saving is handled in handleSaveStep2FollowUp
      } else if (step === 3) {
        if (!validateStep3Data('all')) {
          setIsSaving(false);
          return;
        }
        const pkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option;
        if (pkgId) {
          await saveStep3DataRealtime(editableInclusions, editableDeliverables);
        }
        const updatedRemarks = appendCompletedStep(wizardLeadData.notes || '', 3);
        
        const updatedEvents = crmEvents.map(ev => ({
          ...ev,
          assigned_staff_names: ev.assigned_staff_names || '',
          assigned_staff_mobiles: ev.assigned_staff_mobiles || ''
        }));

        await updateLead(selectedLead.lead_id, {
          budget: Number(wizardLeadData.package_cost),
          package_price: Number(wizardLeadData.package_cost),
          deliverables_description: wizardLeadData.deliverables,
          notes_special_customizations: wizardLeadData.notes,
          remarks: updatedRemarks,
          Select_Package_Option: wizardLeadData.selected_package_id,
          client_residence_address: wizardLeadData.client_residence_address,
          city: wizardLeadData.city,
          state: wizardLeadData.state,
          pincode: wizardLeadData.pincode,
          sales_staff_name: salesStaffName,
          sales_staff_mobile: salesStaffMobile,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: Math.max(0, Number(wizardLeadData.package_cost) + Number(quoteAdditional || 0) - Number(quoteDiscount || 0)),
          events: updatedEvents
        });

        const newCompleted = Math.max(crmHighestStep, 3);
        setCrmHighestStep(newCompleted);
        localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));

        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            budget: Number(wizardLeadData.package_cost),
            package_price: Number(wizardLeadData.package_cost),
            deliverables_description: wizardLeadData.deliverables,
            notes_special_customizations: wizardLeadData.notes,
            remarks: updatedRemarks,
            Select_Package_Option: wizardLeadData.selected_package_id,
            client_residence_address: wizardLeadData.client_residence_address,
            city: wizardLeadData.city,
            state: wizardLeadData.state,
            pincode: wizardLeadData.pincode,
            sales_staff_name: salesStaffName,
            sales_staff_mobile: salesStaffMobile
          };
        });

        if (wizardLeadData.status === 'Order Confirmed') {
          if (!wizardLeadData.confirmed_event_date) {
             showToastMsg("Please provide Confirmed Event Date.", "error");
             setIsSaving(false); return;
          }
          if (!wizardLeadData.final_amount || isNaN(wizardLeadData.final_amount)) {
             showToastMsg("Please provide Final Amount.", "error");
             setIsSaving(false); return;
          }
          
          const pkgName = packages.find(p => p.package_id === wizardLeadData.selected_package_id)?.package_name || 'Selected Package';
          
          let masterOrderId = '';
          try {
             masterOrderId = await confirmOrder(
               selectedLead.lead_id,
               pkgName,
               Number(wizardLeadData.final_amount),
               Number(wizardLeadData.advance_received || 0),
               wizardLeadData.confirmed_event_date,
               wizardLeadData.confirmed_event_time,
               'UPI',
               wizardLeadData.notes || 'Order confirmed via CRM Wizard',
               undefined,
               undefined
             );
          } catch (err: any) {
             console.error('confirmOrder error', err);
             showToastMsg('Failed to confirm order: ' + err.message, 'error');
             setIsSaving(false); return;
          }

          // Save to order_event_reporting
          try {
             if (supabaseClient) {
               const finalAmt = Number(wizardLeadData.final_amount);
               const advanceAmt = Number(wizardLeadData.advance_received || 0);
               const pendingAmt = finalAmt - advanceAmt;
               const paymentStatus = pendingAmt <= 0 ? 'Paid' : 'Pending';

               for (const ev of crmEvents) {
                 const payload = {
                   order_id: masterOrderId,
                   lead_id: selectedLead.lead_id,
                   event_id: ev.id,
                   event_name: ev.event_name || ev.event_type || 'Unknown Event',
                   confirmed_event_date: wizardLeadData.confirmed_event_date,
                   confirmed_event_time: wizardLeadData.confirmed_event_time,
                   contract_final_amount: finalAmt,
                   advance_payment_received: advanceAmt,
                   reporting_date: ev.reporting_date || ev.event_date || wizardLeadData.confirmed_event_date,
                   reporting_time: ev.reporting_time || wizardLeadData.confirmed_event_time,
                   pending_amount: pendingAmt,
                   payment_status: paymentStatus
                 };

                 const { data: existing, error: fetchErr } = await supabaseClient
                   .from('order_event_reporting')
                   .select('event_id')
                   .eq('event_id', ev.id)
                   .maybeSingle();

                 if (fetchErr && fetchErr.code !== 'PGRST116') {
                    throw fetchErr;
                 }

                 if (existing) {
                   const { error: updErr } = await supabaseClient
                     .from('order_event_reporting')
                     .update(payload)
                     .eq('event_id', ev.id);
                   if (updErr) throw updErr;
                 } else {
                   const { error: insErr } = await supabaseClient
                     .from('order_event_reporting')
                     .insert(payload);
                   if (insErr) throw insErr;
                 }
               }
             }
          } catch (err: any) {
             const errMsg = `Failed to save Order Event Reporting.\nTable Name: order_event_reporting\nColumn Name: Multiple (Check schema)\nFailed Function: handleSaveStep -> UPSERT\nSQL Operation: INSERT/UPDATE\nExact Supabase Error: ${err.message || String(err)}\nSuggested Fix: Verify table schema 'order_event_reporting' exists with correct columns.`;
             alert(errMsg);
             setIsSaving(false);
             return;
          }
          
          showToastMsg("Order Confirmed and sent to Operations.", "success");
          setSelectedLead(null);
          setIsSaving(false);
          return;
        }

        showToastMsg(`CRM Changes Saved.`, "success");
        setShowStep3Popup(true);
        setStep3Option('negotiation');
        setIsSaving(false);
        return; // Halt here to wait for popup selection!
      }

      if (step < 3) {
        let nextStep = step + 1;
        setCrmWizardStep(nextStep);
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

  const handleConfirmStep3Proceed = async () => {
    if (!selectedLead) return;
    setIsSaving(true);
    try {
      if (step3Option === 'negotiation') {
        await updateLead(selectedLead.lead_id, {
          status: 'Negotiation' as CurrentStage
        });
        showToastMsg("Lead status updated to Negotiation.", "success");
        setShowStep3Popup(false);
        setSelectedLead(null);
      } else if (step3Option === 'quotation_send') {
        await updateLead(selectedLead.lead_id, {
          status: 'Quotation Sent' as CurrentStage
        });
        showToastMsg("Lead status updated to Quotation Sent.", "success");
        setShowStep3Popup(false);
        setSelectedLead(null);
      }
    } catch (err: any) {
      console.error("Failed to proceed with Step 3 option:", err);
      showToastMsg(err.message || String(err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStep2FollowUp = async () => {
    const isCreateFlow = activeTab === 'create';
    const currentLeadId = isCreateFlow ? createdLeadId : selectedLead?.lead_id;
    if (!currentLeadId) {
      showToastMsg("Lead not initialized yet.", "error");
      return;
    }
    if (!step2FollowUpDate) {
      showToastMsg("Next Follow-up Date is mandatory.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const finalEventsList = (isCreateFlow ? [...createEvents] : [...crmEvents]);
      if (finalEventsList.length === 0) {
        showToastMsg("No events found to save.", "error");
        setIsSaving(false);
        return;
      }
      const firstEvent = finalEventsList[0];

      const formattedEventTime = validateAndFormatTime(firstEvent.event_start_time, "Event Start Time");
      const formattedReportingTime = validateAndFormatTime(isCreateFlow ? reportingTime : wizardLeadData.reporting_time, "Reporting Time");

      // Save event details first
      await updateLead(currentLeadId, {
        event_type: firstEvent.event_type === 'Other' ? 'Other' : firstEvent.event_type,
        custom_event_name: firstEvent.event_name,
        custom_event_type: firstEvent.event_type === 'Other' ? firstEvent.event_name : undefined,
        event_date: firstEvent.event_date,
        Event_End_Date: firstEvent.event_end_date || (firstEvent as any).Event_End_Date || null,
        event_time: formattedEventTime || null,
        event_start_time: firstEvent.event_start_time || null,
        event_end_time: firstEvent.event_end_time || null,
        reporting_time: formattedReportingTime || null,
        event_location: firstEvent.event_location,
        google_maps_link: firstEvent.google_maps_link || '',
        lead_source: isCreateFlow ? createForm.lead_source : wizardLeadData.lead_source,
        shoot_type: firstEvent.event_shoot_type || 'CANDID PHOTOGRAPHY',
        event_shoot_type: firstEvent.event_shoot_type || 'CANDID PHOTOGRAPHY',
        desired_event_shoot_type: firstEvent.event_shoot_type || 'CANDID PHOTOGRAPHY',
        client_residence_address: isCreateFlow ? createForm.client_residence_address : wizardLeadData.client_residence_address,
        city: isCreateFlow ? createForm.city : wizardLeadData.city,
        state: isCreateFlow ? createForm.state : wizardLeadData.state,
        pincode: isCreateFlow ? createForm.pincode : wizardLeadData.pincode,
        total_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        guest_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        staff_pax: firstEvent.staff_pax !== '' && firstEvent.staff_pax != null ? Number(firstEvent.staff_pax) : null,
        
        reference_source: isCreateFlow ? createForm.reference_source : wizardLeadData.reference_source || '',
        Select_Package_Option: isCreateFlow ? (createForm.Select_Package_Option || selectedPkgIds[0] || '') : (wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || ''),
        events: finalEventsList
      });

      // Reload latest Event Details from the database to ensure we have the real IDs
      let reloadedEvents = finalEventsList;
      if (supabaseClient) {
        const { data: dbEvents, error: dbErr } = await supabaseClient
          .from('lead_events')
          .select('*')
          .eq('lead_id', currentLeadId)
          .order('created_at', { ascending: true });
          
        if (dbErr) {
          throw new Error(`Failed to verify saved events: ${dbErr.message || dbErr.details || 'Unknown database error'}`);
        }
        
        if (dbEvents && dbEvents.length > 0) {
          reloadedEvents = dbEvents as LeadEvent[];
          if (isCreateFlow) {
            setCreateEvents(reloadedEvents);
          } else {
            setCrmEvents(reloadedEvents);
          }
        }
      }

      const notesWithTag = appendCompletedStep(step2FollowUpNotes || 'Saved event details', 2);

      // Determine target status: If the current status is New Lead or empty, update to Follow Up. Otherwise preserve advanced status.
      const previousStatus = isCreateFlow ? 'New Lead' : (selectedLead ? getLeadCurrentStatus(selectedLead) : 'New Lead');
      const targetStatus = (previousStatus === 'New Lead' || !previousStatus) ? 'Follow Up' : previousStatus;

      // Update lead follow up and preserve/update status
      await updateLeadFollowUp(
        currentLeadId,
        targetStatus as CurrentStage,
        notesWithTag,
        step2FollowUpDate,
        Number(isCreateFlow ? (createForm.budget || 0) : (wizardLeadData.package_cost || selectedLead?.budget || 0)),
        step2FollowUpNotes || 'Saved event details'
      );

      localStorage.setItem(`follow_up_date_${currentLeadId}`, step2FollowUpDate);
      localStorage.setItem(`follow_up_notes_${currentLeadId}`, step2FollowUpNotes);

      if (isCreateFlow) {
        setSalesStatus(targetStatus as CurrentStage);
        setWizardStep(3);
      } else {
        const newCompleted = Math.max(crmHighestStep, 2);
        setCrmHighestStep(newCompleted);
        if (selectedLead) {
          localStorage.setItem(`crm_last_step_${selectedLead.lead_id}`, String(newCompleted));
        }

        // Locally update the status and remarks
        const timestamp = new Date().toISOString();
        const updatedRemarks = `${selectedLead?.remarks || ''}\n[Update ${timestamp.split('T')[0]}]: ${notesWithTag}. ${step2FollowUpNotes ? 'Neg Notes: ' + step2FollowUpNotes : ''}. Next follow-up: ${step2FollowUpDate}`;

        // Locally update the status
        setSelectedLead(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: targetStatus as CurrentStage,
            current_status: targetStatus,
            remarks: updatedRemarks,
            follow_up_notes: step2FollowUpNotes,
            next_follow_up_date: step2FollowUpDate,
            events: reloadedEvents
          };
        });

        setCrmWizardStep(3);
      }

      showToastMsg("✅ Event Details Saved Successfully", "success");
      setShowStep2Popup(false);
    } catch (err: any) {
      console.error("Step 2 Follow-up save failed:", err);
      const errorMsg = err?.details || err?.message || String(err);
      showToastMsg(`Save Failed: ${errorMsg}`, "error");
      showErrorHelper(
        "Step 2 Save & Next Failed",
        errorMsg,
        "handleSaveStep2FollowUp",
        currentLeadId,
        "Check event details and try again.",
        err
      );
      setTimeout(() => {
        document.getElementById('error_details_modal')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLostLead = async () => {
    if (!selectedLead) return;
    const finalReason = lostReason === 'Other' ? otherLostReason : lostReason;
    if (!finalReason || finalReason.trim() === '') {
      showToastMsg("Lost Reason is mandatory.", "error");
      return;
    }
    if (!lostNotes || lostNotes.trim() === '') {
      showToastMsg("Lost Notes are mandatory.", "error");
      return;
    }
    setIsSaving(true);
    try {
      await updateLead(selectedLead.lead_id, {
        status: 'Lost Lead',
        remarks: `Lost Reason: ${finalReason}. Notes: ${lostNotes}`,
        "Lost_Reason": finalReason,
        "Lost_Notes": lostNotes
      } as any);

      await updateLeadFollowUp(
        selectedLead.lead_id,
        'Lost Lead',
        finalReason,
        '',
        Number(selectedLead.package_price || selectedLead.budget || 0),
        lostNotes
      );

      showToastMsg("Lead status set to Lost successfully.", "success");
      setShowLostModal(false);
      setSelectedLead(null);
    } catch (err: any) {
      console.error("Failed to set lead as lost:", err);
      showToastMsg(err.message || String(err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelLead = async () => {
    const targetLeadId = createdLeadId || selectedLead?.lead_id;
    if (!targetLeadId) {
      showToastMsg("No lead found to cancel.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const existingLead = leads.find(l => l.lead_id === targetLeadId) || selectedLead;
      const leadBudget = existingLead?.budget || 0;

      const finalReason = "Cancelled";
      const cancellationNotes = createdLeadId ? "Cancelled during Step 2 creation" : "Cancelled during Operations configuration";

      let finalEventsList = [...(createdLeadId ? createEvents : crmEvents)];
      if (finalEventsList.length === 0 && (eventForm.event_type || eventForm.event_name || eventForm.event_date || eventForm.event_location)) {
        finalEventsList.push({
          id: `EV-${Math.floor(1000 + Math.random() * 9000)}`,
          event_type: eventForm.event_type || '',
          event_name: eventForm.event_name || '',
          event_shoot_type: eventForm.event_shoot_type || '',
          event_date: eventForm.event_date || '',
          event_start_time: eventForm.event_start_time || '',
          event_end_time: eventForm.event_end_time || '',
          event_location: eventForm.event_location || '',
          google_maps_link: eventForm.google_maps_link || '',
          guest_pax: eventForm.guest_pax || '',
          staff_pax: eventForm.staff_pax || '',
          event_start_date: eventForm.event_date || '',
          event_end_date: eventForm.event_end_date || ''
        } as any);
      }
      const firstEvent = finalEventsList[0] || {};
      const payload: any = {
        status: 'Lost Lead',
        current_status: 'Lost Lead',
        remarks: `Lost Reason: ${finalReason}. Notes: ${cancellationNotes}`,
        "Lost_Reason": finalReason,
        "Lost_Notes": cancellationNotes,
        
        client_residence_address: createForm.client_residence_address || existingLead?.client_residence_address || '',
        city: createForm.city || existingLead?.city || '',
        state: createForm.state || existingLead?.state || '',
        pincode: createForm.pincode || existingLead?.pincode || '',
        
        event_type: firstEvent.event_type || '',
        custom_event_name: firstEvent.event_name || '',
        event_date: firstEvent.event_date || '',
        event_start_time: firstEvent.event_start_time || null,
        event_end_time: firstEvent.event_end_time || null,
        event_location: firstEvent.event_location || '',
        google_maps_link: firstEvent.google_maps_link || '',
        event_shoot_type: firstEvent.event_shoot_type || '',
        guest_pax: firstEvent.guest_pax !== '' && firstEvent.guest_pax != null ? Number(firstEvent.guest_pax) : null,
        staff_pax: firstEvent.staff_pax !== '' && firstEvent.staff_pax != null ? Number(firstEvent.staff_pax) : null,
        
        next_follow_up_date: step2FollowUpDate || null,
        follow_up_notes: step2FollowUpNotes || null,
        
        events: finalEventsList
      };

      await updateLead(targetLeadId, payload);

      await updateLeadFollowUp(
        targetLeadId,
        'Lost Lead',
        finalReason,
        step2FollowUpDate || '',
        Number(leadBudget),
        cancellationNotes
      );

      showToastMsg("Lead marked as Lost successfully.", "success");
      setShowCancelConfirmPopup(false);
      resetForm();
      setActiveTab('list');
    } catch (err: any) {
      console.error("Error marking lead as Lost:", err);
      showToastMsg(`Failed to mark lead as Lost: ${err.message || err}`, "error");
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
        const cleanInput = String(value).replace(/[^\d]/g, '').slice(-10);
        if (!cleanInput || cleanInput.length < 10) return false;
        const cleanMobile = String(c.mobile || '').replace(/[^\d]/g, '').slice(-10);
        const cleanAlt = String(c.alternate_mobile || '').replace(/[^\d]/g, '').slice(-10);
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
      event_type: '',
      custom_event_name: '',
      custom_event_type: '',
      event_date: '',
      event_time: '',
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

  const handleSaveEventForm = (isCrm: boolean = !!selectedLead, addAnother: boolean = false) => {
    if (!eventForm.event_type) {
      showValidationError("input_event_type", "Event Type is required.");
      return;
    }
    if (!eventForm.event_date) {
      showValidationError("input_event_date", "Event Date is required.");
      return;
    }
    if (!eventForm.event_location.trim()) {
      showValidationError("input_event_location", "Event Location is required.");
      return;
    }

    if (isEventDateTimeInvalid(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time)) {
      showToastMsg("Event End Date & Time must be later than Event Start Date & Time.", "error");
      return;
    }

    const guestPaxVal = eventForm.guest_pax !== '' ? Math.max(0, parseInt(String(eventForm.guest_pax)) || 0) : '';
    const staffPaxVal = eventForm.staff_pax !== '' ? Math.max(0, parseInt(String(eventForm.staff_pax)) || 0) : '';

    const eventData = {
      ...eventForm,
      guest_pax: guestPaxVal,
      staff_pax: staffPaxVal,
      event_start_date: eventForm.event_date,
      event_end_date: eventForm.event_end_date || ''
    };

    const savedEventType = eventForm.event_type;

    if (isCrm) {
      if (editingEventId) {
        setCrmEvents(prev => prev.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev));
        showToastMsg("Event updated in list.", "success");
      } else {
        const newEv: LeadEvent = {
          ...eventData,
          id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
        };
        setCrmEvents(prev => [...prev, newEv]);
        showToastMsg("Event added to list.", "success");
      }
    } else {
      if (editingEventId) {
        setCreateEvents(prev => prev.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev));
        showToastMsg("Event updated in list.", "success");
      } else {
        const newEv: LeadEvent = {
          ...eventData,
          id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
        };
        setCreateEvents(prev => [...prev, newEv]);
        showToastMsg("Event added to list.", "success");
      }
    }

    setEditingEventId(null);

    if (addAnother) {
      setEventForm({
        event_type: '',
        event_name: '',
        event_shoot_type: '',
        event_date: '',
        event_start_time: '',
        event_end_time: '',
        event_location: '',
        google_maps_link: '',
        guest_pax: "" as any,
        staff_pax: "" as any,
        event_start_date: '',
        event_end_date: ''
      });
      setShowEventForm(true);
    } else {
      setShowEventForm(false);
    }
  };

  const handleEditEvent = (ev: LeadEvent) => {
    setEditingEventId(ev.id);
    const startDate = ev.event_start_date || ev.event_date || '';
    const endDate = ev.event_end_date || (ev as any).Event_End_Date || (ev as any).Event_end_date || '';
    const startTime = ev.event_start_time || (ev as any).start_time || (ev as any).event_time || '';
    const endTime = ev.event_end_time || (ev as any).end_time || '';
    const location = ev.event_location || (ev as any).location || (ev as any).venue_address || '';
    const maps = ev.google_maps_link || (ev as any).maps_link || '';

    setEventForm({
      event_type: ev.event_type || '',
      event_name: ev.event_name || '',
      event_shoot_type: ev.event_shoot_type || '',
      event_date: startDate,
      event_start_date: startDate,
      event_end_date: endDate,
      event_start_time: startTime,
      event_end_time: endTime,
      event_location: location,
      google_maps_link: maps,
      guest_pax: ev.guest_pax !== null && ev.guest_pax !== undefined ? ev.guest_pax : ('' as any),
      staff_pax: ev.staff_pax !== null && ev.staff_pax !== undefined ? ev.staff_pax : ('' as any),
      reporting_date: ev.reporting_date || '',
      reporting_time: ev.reporting_time || ''
    });
    setShowEventForm(true);
  };

  const handleDeleteEvent = (id: string, isCrm: boolean = !!selectedLead) => {
    if (isCrm) {
      setCrmEvents(prev => prev.filter(ev => ev.id !== id));
    } else {
      setCreateEvents(prev => prev.filter(ev => ev.id !== id));
    }
    showToastMsg("Event removed from list.", "success");
  };

  const handleAddNewEventClick = (isCrm: boolean = !!selectedLead) => {
    setEditingEventId(null);
    setEventForm({
      event_type: '',
      event_name: '',
      event_shoot_type: '',
      event_date: '',
      event_start_time: '',
      event_end_time: '',
      event_location: '',
      google_maps_link: '',
      guest_pax: "" as any,
      staff_pax: "" as any,
      event_start_date: '',
      event_end_date: ''
    });
    setShowEventForm(true);
  };

  const formatDDMMYYYY = (dateStr: string | undefined | null): string => {
    if (!dateStr) return 'N/A';
    const clean = dateStr.trim();
    if (!clean) return 'N/A';
    if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) return clean;
    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return clean;
  };

  const convertTo24Hour = (timeStr: string | undefined | null): string => {
    if (!timeStr) return '';
    const clean = timeStr.trim().toUpperCase();
    if (!clean) return '';

    // Match 12-hour AM/PM format (e.g., "08:00 AM", "8:00:00 AM", "12:30 PM", "01:00:00 PM")
    const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = ampmMatch[2];
      const period = ampmMatch[3];

      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      const hh = String(hours).padStart(2, '0');
      return `${hh}:${minutes}`;
    }

    // Check if it's in 24-hour format with or without seconds (e.g., "14:30", "14:30:00", "8:30:00")
    const hhmmssMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (hhmmssMatch) {
      const hh = String(parseInt(hhmmssMatch[1], 10)).padStart(2, '0');
      const mm = hhmmssMatch[2];
      return `${hh}:${mm}`;
    }

    return '';
  };

  const convertTo12Hour = (timeStr: string | undefined | null): string => {
    if (!timeStr) return '';
    const clean = timeStr.trim();
    if (!clean) return '';

    // If it already has AM/PM, format nicely
    if (clean.toUpperCase().includes('AM') || clean.toUpperCase().includes('PM')) {
      const ampmMatch = clean.toUpperCase().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
      if (ampmMatch) {
        const hh = String(parseInt(ampmMatch[1], 10)).padStart(2, '0');
        const mm = ampmMatch[2];
        const period = ampmMatch[3];
        return `${hh}:${mm} ${period}`;
      }
      return clean;
    }

    // Match 24-hour format HH:MM or HH:MM:SS
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) {
      return clean;
    }

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    if (hours === 0) {
      hours = 12;
    }

    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes} ${period}`;
  };

  const normalizeDateStr = (dStr: string | undefined | null): string => {
    if (!dStr) return '';
    const trimmed = dStr.trim();
    if (!trimmed) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return trimmed;
  };

  const isEventDateTimeInvalid = (
    startDate: string | undefined | null,
    endDate: string | undefined | null,
    startTime: string | undefined | null,
    endTime: string | undefined | null
  ): boolean => {
    if (!startDate) return false;
    const startD = normalizeDateStr(startDate);
    const endD = normalizeDateStr(endDate) || startD;

    if (startD && endD && endD < startD) {
      return true; // End Date is earlier than Start Date
    }

    if (startD && endD && endD > startD) {
      return false; // End Date is strictly after Start Date, so any End Time is valid
    }

    // Same day case: compare start and end times if both are present
    if (startTime && endTime) {
      const start24 = convertTo24Hour(startTime);
      const end24 = convertTo24Hour(endTime);
      if (start24 && end24 && end24 <= start24) {
        return true; // End Time is not later than Start Time on the same day
      }
    }

    return false;
  };

  const isTimeEarlier = (start: string | undefined | null, end: string | undefined | null): boolean => {
    return isEventDateTimeInvalid(eventForm.event_date, eventForm.event_end_date, start, end);
  };

  const renderEventDetailsSection = (isCrm: boolean) => {
    const eventsList = isCrm ? crmEvents : createEvents;
    const isFormVisible = showEventForm || eventsList.length === 0;

    return (
      <div className="space-y-4">
        {/* Render Event Cards */}
        {eventsList.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Added Events ({eventsList.length})
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {eventsList.map((ev, idx) => {
                const isCollapsed = collapsedEventIds[ev.id] ?? false;
                const startDateStr = formatDDMMYYYY(ev.event_start_date || ev.event_date);
                const endDateRaw = ev.event_end_date || (ev as any).Event_End_Date || '';
                const endDateStr = endDateRaw ? formatDDMMYYYY(endDateRaw) : 'N/A';
                const startTimeStr = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A';
                const endTimeStr = ev.event_end_time ? convertTo12Hour(ev.event_end_time) : 'N/A';

                return (
                  <div key={ev.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                    <div 
                      className="flex items-center justify-between p-3.5 bg-slate-950/40 cursor-pointer select-none border-b border-slate-800/40"
                      onClick={() => setCollapsedEventIds(prev => ({ ...prev, [ev.id]: !isCollapsed }))}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="bg-cyan-500/10 text-cyan-400 p-1.5 rounded-lg">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{ev.event_name || `Event ${idx + 1}`}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono font-bold">
                              {ev.event_type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            Start: {startDateStr} {startTimeStr !== 'N/A' ? `| ${startTimeStr}` : ''}
                            {endDateRaw ? ` • End: ${endDateStr} ${endTimeStr !== 'N/A' ? `| ${endTimeStr}` : ''}` : (endTimeStr !== 'N/A' ? ` • End Time: ${endTimeStr}` : '')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleEditEvent(ev)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-cyan-400 transition-colors"
                          title="Edit Event"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id, isCrm)}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove Event"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCollapsedEventIds(prev => ({ ...prev, [ev.id]: !isCollapsed }))}
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="p-4 bg-slate-900/50 text-xs text-slate-300 space-y-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 font-mono">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Start Date</span>
                            <span className="text-slate-200 font-semibold">{startDateStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">Start Time</span>
                            <span className="text-slate-200 font-semibold">{startTimeStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">End Date</span>
                            <span className="text-slate-200 font-semibold">{endDateStr}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase tracking-wider mb-0.5">End Time</span>
                            <span className="text-slate-200 font-semibold">{endTimeStr}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          <div>
                            <span className="text-slate-400">Guest Pax:</span>
                            <span className="ml-1.5 font-semibold text-slate-200">{ev.guest_pax !== '' && ev.guest_pax !== null && ev.guest_pax !== undefined ? ev.guest_pax : 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Staff Pax:</span>
                            <span className="ml-1.5 font-semibold text-slate-200">{ev.staff_pax !== '' && ev.staff_pax !== null && ev.staff_pax !== undefined ? ev.staff_pax : 'N/A'}</span>
                          </div>
                        </div>

                        <div className="border-t border-slate-800/40 pt-2.5 text-left">
                          <span className="text-slate-400 block mb-1">Venue Address:</span>
                          <p className="text-slate-200 bg-slate-950/20 p-2 rounded border border-slate-850/50 whitespace-pre-wrap">
                            {ev.event_location}
                          </p>
                        </div>

                        {ev.google_maps_link && (
                          <div className="flex items-center gap-1.5 text-cyan-400 text-left">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <a 
                              href={ev.google_maps_link} 
                              target="_blank" 
                              referrerPolicy="no-referrer"
                              rel="noopener noreferrer" 
                              className="hover:underline break-all"
                            >
                              {ev.google_maps_link}
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inline Event Form */}
        {isFormVisible ? (
          <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-4 space-y-4 animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                {editingEventId ? 'Edit Event Details' : 'Event Details'}
              </span>
              {eventsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEventId(null);
                  }}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Event Type */}
              <div className="text-left">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Event Type *
                </label>
                <select
                  id="input_event_type"
                  value={eventForm.event_type}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEventForm(prev => ({
                      ...prev,
                      event_type: val,
                      event_name: prev.event_name || ''
                    }));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all cursor-pointer font-bold"
                >
                  <option value="">Select Event Type</option>
                  {EVENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Conditional Event Details fields displayed only after Event Type is selected */}
              {eventForm.event_type && eventForm.event_type !== '' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                  {/* Event Name */}
                  <div className="sm:col-span-2 text-left">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Event Name
                    </label>
                    <input
                      id="input_event_name"
                      type="text"
                      placeholder="e.g. Sangeet, Haldi, Reception"
                      value={eventForm.event_name}
                      onChange={(e) => setEventForm({ ...eventForm, event_name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  {/* Event Date */}
                  <div className="text-left">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Event Date *
                    </label>
                    <input
                      id="input_event_date"
                      type="date"
                      required
                      value={eventForm.event_date}
                      onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Event Start Time */}
                  <div className="text-left">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Event Start Time
                    </label>
                    <input
                      id="input_event_start_time"
                      type="time"
                      value={convertTo24Hour(eventForm.event_start_time)}
                      onChange={(e) => {
                        const val24 = e.target.value;
                        const val12 = convertTo12Hour(val24);
                        setEventForm({ ...eventForm, event_start_time: val12 });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono cursor-pointer"
                    />
                  </div>

                  {/* Event End Date */}
                  <div className="text-left">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Event End Date
                    </label>
                    <input
                      id="input_event_end_date"
                      type="date"
                      value={eventForm.event_end_date || ''}
                      onChange={(e) => setEventForm({ ...eventForm, event_end_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono cursor-pointer"
                    />
                  </div>

                  {/* Event End Time */}
                  <div className="text-left">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Event End Time
                    </label>
                    <input
                      id="input_event_end_time"
                      type="time"
                      value={convertTo24Hour(eventForm.event_end_time)}
                      onChange={(e) => {
                        const val24 = e.target.value;
                        const val12 = convertTo12Hour(val24);
                        setEventForm({ ...eventForm, event_end_time: val12 });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono cursor-pointer"
                    />
                    {isEventDateTimeInvalid(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time) && (
                      <p className="text-[11px] text-rose-400 mt-1 animate-fade-in font-medium">
                        End Date & Time must be later than Start Date & Time.
                      </p>
                    )}
                  </div>

                  {/* Event Location - Multiline Address */}
                  <div className="sm:col-span-2 text-left">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Event Location * (Venue Address)
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Enter the full event location and venue address details"
                      value={eventForm.event_location}
                      onChange={(e) => setEventForm({ ...eventForm, event_location: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none"
                    />
                  </div>

                  {/* Google Maps Link */}
                  <div className="sm:col-span-2 text-left">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Google Maps Location Link (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. https://maps.app.goo.gl/..."
                      value={eventForm.google_maps_link}
                      onChange={(e) => setEventForm({ ...eventForm, google_maps_link: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                    />
                  </div>

                  {/* Guest Pax */}
                  <div className="text-left">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Guest Pax
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 150"
                      value={eventForm.guest_pax}
                      onChange={(e) => setEventForm({ ...eventForm, guest_pax: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Staff Pax */}
                  <div className="text-left">
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Staff Pax
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5"
                      value={eventForm.staff_pax}
                      onChange={(e) => setEventForm({ ...eventForm, staff_pax: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Save Event Buttons */}
                  <div className="sm:col-span-2 flex flex-wrap justify-end gap-2 pt-2">
                    {eventsList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowEventForm(false);
                          setEditingEventId(null);
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    {editingEventId ? (
                      <button
                        type="button"
                        onClick={() => handleSaveEventForm(isCrm, false)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-slate-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm"
                      >
                        Update Event
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEventForm(isCrm, false)}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm"
                        >
                          Save Event
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEventForm(isCrm, true)}
                          className="bg-cyan-600 hover:bg-cyan-500 text-slate-100 font-bold px-4 py-2 rounded-lg text-xs transition-colors shadow-sm"
                        >
                          Save & Add Another Event
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Add Another Event Button */
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => handleAddNewEventClick(isCrm)}
              className="flex items-center gap-1.5 border border-dashed border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 bg-slate-900/30 px-4 py-2.5 rounded-lg text-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Another Event</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleWizardNext = async () => {
    if (isSaving) return;

    let finalUser: any = null;

    if (wizardStep === 1) {
      if (!createForm.mobile) {
        showValidationError("input_mobile", "Phone Number is required.");
        return;
      }
      if (!createForm.lead_source || createForm.lead_source === '') {
        showValidationError("input_lead_source", "Lead Source is required.");
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

          finalUser = currentUser;
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
        finalUser = currentUser;
        if (currentUser.role !== 'Sales Team' && currentUser.role !== 'Business Owner') {
          showToastMsg("User does not have permission to create leads.", "error");
          return;
        }
      }

      const mobileVal = String(createForm.mobile || '').trim();
      if (!/^\d{10}$/.test(mobileVal)) {
        showToastMsg("Please enter a valid 10-digit mobile number.", "error");
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
        const finalSource = createForm.lead_source === 'Other' ? 'Other' : createForm.lead_source;
        const customLeadSourceName = createForm.lead_source === 'Other' && otherSource.trim() !== '' ? otherSource.trim() : null;
        let finalId = createdLeadId;
        if (!createdLeadId) {
          const newId = await addLead({
            customer_name: createForm.customer_name || '',
            mobile: createForm.mobile,
            alternate_mobile: (createForm.alternate_mobile && String(createForm.alternate_mobile).trim() !== '' && String(createForm.alternate_mobile).trim() !== '+91') ? String(createForm.alternate_mobile) : undefined,
            email: createForm.email,
            lead_source: finalSource,
            Specify_Custom_Lead_Source_Name: customLeadSourceName,
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
            Additional_Services_Cost: null,
            Quotation_Discount: null,
            Final_Quotation_Amount: null,
            event_type: createForm.event_type || '',
            event_date: createForm.event_date || '',
            event_time: createForm.event_time || '',
            event_location: createForm.event_location || '',
            budget: Number(createForm.budget) || 0,
            remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
            Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
          });
          setCreatedLeadId(newId);
          finalId = newId;
          console.log(`Created lead with ID: ${newId}`);
        } else {
          await updateLead(createdLeadId, {
            customer_name: createForm.customer_name || '',
            mobile: createForm.mobile,
            alternate_mobile: (createForm.alternate_mobile && String(createForm.alternate_mobile).trim() !== '' && String(createForm.alternate_mobile).trim() !== '+91') ? String(createForm.alternate_mobile) : undefined,
            email: createForm.email,
            lead_source: finalSource,
            Specify_Custom_Lead_Source_Name: customLeadSourceName,
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
            Additional_Services_Cost: null,
            Quotation_Discount: null,
            Final_Quotation_Amount: null,
            remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
            Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
          });
        }
        const isEdit = !!createdLeadId;

        const newLeadObj: Lead = {
          lead_id: finalId,
          customer_name: createForm.customer_name || '',
          mobile: createForm.mobile,
          alternate_mobile: (createForm.alternate_mobile && String(createForm.alternate_mobile).trim() !== '' && String(createForm.alternate_mobile).trim() !== '+91') ? String(createForm.alternate_mobile) : undefined,
          email: createForm.email,
          lead_source: finalSource,
            Specify_Custom_Lead_Source_Name: customLeadSourceName,
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
          booking_status: createForm.booking_status || 'Pending',
          event_type: createForm.event_type || 'Other',
          event_date: createForm.event_date || new Date().toISOString().split('T')[0],
          event_time: createForm.event_time || '12:00',
          event_location: createForm.event_location || 'TBD',
          budget: Number(createForm.budget) || 0,
            Additional_Services_Cost: null,
            Quotation_Discount: null,
            Final_Quotation_Amount: null,
          remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
          Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || '',
          status: 'New Lead',
          created_date: new Date().toISOString().split('T')[0],
          sales_person: finalUser?.name || currentUser?.name || 'Sales Team',
          created_by: finalUser?.name || currentUser?.name || 'Sales Team'
        };

        // Stay in Create Lead form, and advance to Step 2
        setWizardStep(2);

        showToastMsg("Inbound lead created successfully! Continuing to Step 2.", "success");
      } catch (err: any) {
        console.error("Step 1 saving failed:", err);
  
      const errMsg = err.message || String(err);
      
      if (errMsg.includes('FATAL_MISSING_COLUMN')) {
        const parts = errMsg.split('||');
        const table = parts[1] || 'leads';
        const col = parts[2] || 'Unknown';
        const sql = `ALTER TABLE "${table}" ADD COLUMN "${col}" numeric;`;
        const colType = col === 'Specify_Custom_Lead_Source_Name' ? 'text' : 'numeric';
        const properSql = `ALTER TABLE "${table}" ADD COLUMN "${col}" ${colType};`;
        
        showToastMsg(`CRITICAL DB ERROR:\nTable: ${table}\nMissing Column: ${col}\nSuggested SQL: ${properSql}`, "error");
        setIsSaving(false);
        return;
      }

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
      let finalEventsList = [...createEvents];
      
      // If eventForm is visible or there are no events in the list, validate and add
      if (showEventForm || finalEventsList.length === 0) {
        if (!eventForm.event_type || eventForm.event_type === '') {
          showValidationError("input_event_type", "Please select Event Type.");
          return;
        }
        if (!eventForm.event_date || eventForm.event_date === '') {
          showValidationError("input_event_date", "Please select Event Date.");
          return;
        }
        if (!eventForm.event_location || eventForm.event_location.trim() === '') {
          showValidationError("input_event_location", "Please enter Event Location.");
          return;
        }
        if (isEventDateTimeInvalid(eventForm.event_date, eventForm.event_end_date, eventForm.event_start_time, eventForm.event_end_time)) {
          showValidationError("input_event_end_time", "Event End Date & Time must be later than Event Start Date & Time.");
          return;
        }

        const guestPaxVal = eventForm.guest_pax !== '' ? Math.max(0, parseInt(String(eventForm.guest_pax)) || 0) : '';
        const staffPaxVal = eventForm.staff_pax !== '' ? Math.max(0, parseInt(String(eventForm.staff_pax)) || 0) : '';

        const eventData = {
          ...eventForm,
          guest_pax: guestPaxVal,
          staff_pax: staffPaxVal,
          event_start_date: eventForm.event_date,
          event_end_date: eventForm.event_end_date || ''
        };

        if (editingEventId) {
          finalEventsList = finalEventsList.map(ev => ev.id === editingEventId ? { ...eventData, id: editingEventId } : ev);
        } else {
          finalEventsList.push({
            ...eventData,
            id: `EV-${Math.floor(1000 + Math.random() * 9000)}`
          });
        }
        
        setCreateEvents(finalEventsList);
        setEditingEventId(null);
        setShowEventForm(false);
      }

      if (finalEventsList.length === 0) {
        showToastMsg("Please add at least one event.", "error");
        return;
      }

      // Pre-validate and format all events in the finalEventsList
      for (const ev of finalEventsList) {
        try {
          ev.event_start_time = validateAndFormatTime(ev.event_start_time, "Event Start Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          return;
        }
        try {
          ev.event_end_time = validateAndFormatTime(ev.event_end_time, "Event End Time") || '';
        } catch (err: any) {
          showToastMsg(err.message, "error");
          return;
        }
      }

      const firstEvent = finalEventsList[0];

      try {
        // Open Step 2 Follow-up details modal before moving to Step 3
        const currentId = createdLeadId;
        const savedDate = currentId ? (localStorage.getItem(`follow_up_date_${currentId}`) || '') : '';
        const savedNotes = currentId ? (localStorage.getItem(`follow_up_notes_${currentId}`) || '') : '';
        setStep2FollowUpDate(savedDate);
        setStep2FollowUpNotes(savedNotes);
        setShowStep2Popup(true);
        setIsSaving(false);
      } catch (err: any) {
        console.error("Step 2 saving failed:", err);
  
      const errMsg = err.message || String(err);
      
      if (errMsg.includes('FATAL_MISSING_COLUMN')) {
        const parts = errMsg.split('||');
        const table = parts[1] || 'leads';
        const col = parts[2] || 'Unknown';
        const sql = `ALTER TABLE "${table}" ADD COLUMN "${col}" numeric;`;
        const colType = col === 'Specify_Custom_Lead_Source_Name' ? 'text' : 'numeric';
        const properSql = `ALTER TABLE "${table}" ADD COLUMN "${col}" ${colType};`;
        
        showToastMsg(`CRITICAL DB ERROR:\nTable: ${table}\nMissing Column: ${col}\nSuggested SQL: ${properSql}`, "error");
        setIsSaving(false);
        return;
      }

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

  };

  const handleStatusSave = async () => {
    if (isSaving) return;
    const finalStatus = salesStatus || 'New Lead';
    try {
      setIsSaving(true);

      // Save Packages
      const selectedPkgs = PACKAGES_LIST.flatMap(cat => cat.items).filter(item => selectedPkgIds.includes(item.id));
      if (selectedPkgIds.length > 0) {
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
          additional_services_cost: 0,
          team_members: pkg.team_members || '',
          deliverables: pkg.deliverables || ''
        }));
        await saveLeadPackages(createdLeadId!, packagesPayload);
      }

      await updateLead(createdLeadId!, {
        status: finalStatus as CurrentStage,
        budget: finalTotal,
          package_price: finalTotal,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalTotal,
        deliverables_description: selectedPkgs.map(p => pkgDeliverables[p.id] || p.deliverables || 'N/A').join('\n'),
        notes_special_customizations: selectedPkgs.map(p => pkgNotes[p.id] || '').join('\n'),
        sales_staff_name: salesStaffName,
        sales_staff_mobile: salesStaffMobile,
        client_residence_address: createForm.client_residence_address,
        city: createForm.city,
        state: createForm.state,
        pincode: createForm.pincode,
        desired_event_shoot_type: createForm.desired_event_shoot_type,
        remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),
            next_follow_up_date: followUpDate || null,
            follow_up_notes: internalNotes || null,
        Select_Package_Option: createForm.Select_Package_Option || selectedPkgIds[0] || ''
      });
      showToastMsg("Lead created successfully.", "success");
      resetForm();
      setActiveTab('list');
    } catch (err: any) {
      console.error("Step 5 status save failed:", err);
      const errMsg = err?.message || String(err);
      const parsed = parseStatusUpdateError(errMsg);

      const targetLd = leads.find(l => l.lead_id === createdLeadId);
      const oldStatus = targetLd ? (targetLd.current_status || targetLd.status || 'New Lead') : null;
      const newStatus = finalStatus || null;

      logStatusUpdateError({
        leadId: createdLeadId || null,
        orderId: null,
        oldStatus,
        newStatus,
        updatePayload: {
          status: finalStatus,
          budget: finalTotal,
          package_price: finalTotal,
          Quotation_Discount: quoteDiscount === "" ? null : Number(quoteDiscount),
          Additional_Services_Cost: quoteAdditional === "" ? null : Number(quoteAdditional),
          Final_Quotation_Amount: finalTotal,
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
      showToastMsg("Please select Confirmed Event Date.", "error");
      return;
    }

    if (finalPackageAmount === undefined || finalPackageAmount === 0 || isNaN(finalPackageAmount)) {
      showToastMsg("Please enter Final Amount.", "error");
      return;
    }
    if (advanceReceived === undefined || isNaN(advanceReceived)) {
      showToastMsg("Please enter Advance Paid Amount.", "error");
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
      
      showToastMsg("Lead created successfully.", "success");
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

    if (followUpForm.status === 'Order Confirmed' || followUpForm.status === 'Confirm Order') {
      if (!followUpForm.event_date) {
        showToastMsg("Please select Confirmed Event Date.", "error");
        return;
      }

      if (followUpForm.quotation_amount === undefined || followUpForm.quotation_amount === 0 || isNaN(followUpForm.quotation_amount)) {
        showToastMsg("Please enter Final Amount.", "error");
        return;
      }
      if (followUpForm.advance_received === undefined || isNaN(followUpForm.advance_received) || Number(followUpForm.advance_received) <= 0) {
        showToastMsg("Please enter Advance Paid Amount.", "error");
        return;
      }
      if (!followUpForm.transaction_id || !followUpForm.transaction_id.trim()) {
        showToastMsg("Please enter Payment Tracking ID / Transaction Reference Number.", "error");
        return;
      }

      const packageName = packages?.find(p => String(p.package_id) === String(selectedLead.Select_Package_Option))?.package_name || selectedLead.Select_Package_Option || '';

      try {
        setIsSaving(true);
        await confirmOrder(
          selectedLead.lead_id,
          packageName,
          Number(followUpForm.quotation_amount),
          Number(followUpForm.advance_received),
          followUpForm.event_date,
          followUpForm.event_time,
          followUpForm.payment_mode || 'UPI',
          followUpForm.call_notes || 'Confirmed from CRM activity logger',
          followUpForm.reporting_time || '08:00',
          followUpForm.transaction_id
        );

        setSelectedLead(null);
        showToastMsg("Order Confirmed Successfully.", "success");
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
            package_name: packageName,
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

  const handleFinalReportingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSaving) return;

    try {
      setIsSaving(true);
      
      const crmEvents = selectedLead.events || [];
      if (crmEvents.length > 0) {
        // Save event-wise reporting details
        const updatedEvents = crmEvents.map(ev => {
          const fd = finalReportingForm[ev.id] || { reporting_date: '', reporting_time: '' };
          return {
            ...ev,
            reporting_date: fd.reporting_date,
            reporting_time: fd.reporting_time
          };
        });
        
        await updateLead(selectedLead.lead_id, {
          events: updatedEvents,
          Reporting_date: updatedEvents[0]?.reporting_date || '', // fallback
          reporting_time: updatedEvents[0]?.reporting_time || ''
        });
      } else {
        // Fallback for leads without explicit events
        const fd = finalReportingForm['default'] || { reporting_date: '', reporting_time: '' };
        await updateLead(selectedLead.lead_id, {
          Reporting_date: fd.reporting_date,
          reporting_time: fd.reporting_time
        });
      }

      setShowFinalReportingModal(false);
      setSelectedLead(null);
      showToastMsg("Reporting Details Saved Successfully.", "success");
    } catch (err) {
      console.error(err);
      showToastMsg("Failed to save Reporting Details.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Order Confirmation Process
  const handleConfirmOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || isSaving) return;

    if (!confirmForm.event_date) {
      showToastMsg("Please select Confirmed Event Date.", "error");
      return;
    }

    if (confirmForm.quotation_amount === undefined || confirmForm.quotation_amount === 0 || isNaN(confirmForm.quotation_amount)) {
      showToastMsg("Please enter Final Amount.", "error");
      return;
    }
    if (confirmForm.advance_received === undefined || isNaN(confirmForm.advance_received) || Number(confirmForm.advance_received) <= 0) {
      showToastMsg("Please enter Advance Paid Amount.", "error");
      return;
    }
    if (!confirmForm.transaction_id || !confirmForm.transaction_id.trim()) {
      showToastMsg("Please enter Payment Tracking ID / Transaction Reference Number.", "error");
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
      showToastMsg("Booking Confirmation saved successfully.", "success");
      setWizardLeadData(prev => ({
        ...prev,
        advance_received: Number(confirmForm.advance_received)
      }));
      
      const repDate = selectedLead.Reporting_date || confirmForm.event_date || '';
      const repTime = selectedLead.reporting_time || confirmForm.event_time || '';
      
      const crmEvents = selectedLead.events || [];
      const initialFormState: Record<string, { reporting_date: string, reporting_time: string }> = {};

      if (crmEvents.length > 0) {
        crmEvents.forEach((ev) => {
          initialFormState[ev.id] = {
            reporting_date: '',
            reporting_time: ''
          };
        });
      } else {
        initialFormState['default'] = {
          reporting_date: '',
          reporting_time: ''
        };
      }

      setFinalReportingForm(initialFormState);
      setShowFinalReportingModal(true);
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

  const statQuotesSent = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Quote Sent' || st === 'Quotation Sent';
  }).length;
  const statQuoteFollowups = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Quote Follow-up' || st === 'Follow Up' || st === 'Follow-up';
  }).length;
  const statConfirmedOrders = leads.filter(l => {
    const st = getLeadCurrentStatus(l);
    return st === 'Confirm Order' || st === 'Order Confirmed';
  }).length;

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
            if (filterLower === 'project completed') {
              return statusLower === 'project completed' || statusLower === 'project closed' || statusLower === 'completed' || statusLower === 'closed' || statusLower === 'project delivered' || statusLower === 'delivered' || statusLower === 'approved' || statusLower === 'final approval' || statusLower === 'client approved';
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
            className={`hidden px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
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
                <span className="text-slate-500 block">Event Type</span>
                <strong className="text-slate-200 font-medium">{selectedLead.event_type === 'Other' ? (selectedLead.custom_event_name || selectedLead.custom_event_type || 'Other') : selectedLead.event_type}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Lead Source</span>
                <strong className="text-slate-200 font-medium">
                  {selectedLead.lead_source === 'Other' && selectedLead.Specify_Custom_Lead_Source_Name 
                    ? `Other: ${selectedLead.Specify_Custom_Lead_Source_Name}` 
                    : selectedLead.lead_source}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Events Scheduled</span>
                <div className="flex flex-col gap-1 mt-1">
                  {selectedLead.events && selectedLead.events.length > 0 ? (
                    selectedLead.events.map((ev, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-amber-500 font-semibold">{ev.event_name || ev.event_type || 'Event'}</span>
                        <br/>
                        <strong className="text-slate-200 font-medium font-mono text-[10px]">{ev.event_date} {ev.event_start_time ? `@ ${formatTime12Hour(ev.event_start_time)}` : ''}</strong>
                      </div>
                    ))
                  ) : (
                    <strong className="text-slate-200 font-medium">{selectedLead.event_date || 'N/A'} {selectedLead.event_time ? `@ ${formatTime12Hour(selectedLead.event_time)}` : ''}</strong>
                  )}
                </div>
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
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setConfirmForm({
                      ...confirmForm,
                      package_name: packages?.find((p) => String(p.package_id) === String(selectedLead.Select_Package_Option))?.package_name || selectedLead.Select_Package_Option || '',
                      quotation_amount: Number(selectedLead.Final_Quotation_Amount) || Number((selectedLead as any).final_amount) || 0,
                      advance_received: 0,
                      event_date: selectedLead.event_date || today,
                      event_time: selectedLead.event_time || ''
                    });
                    setShowConfirmModal(true);
                  }}
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
                      <select
                        value={followUpForm.status}
                        onChange={(e) => setFollowUpForm({ ...followUpForm, status: e.target.value as CurrentStage })}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Quote Sent">Quote Sent</option>
                        <option value="Quote Follow-up">Quote Follow-up</option>
                        <option value="Confirm Order">Confirm Order</option>
                        {followUpForm.status && !['Quote Sent', 'Quote Follow-up', 'Confirm Order', 'Order Confirmed', 'Quotation Sent', 'Follow Up'].includes(followUpForm.status) && (
                          <option value={followUpForm.status}>{followUpForm.status}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {(followUpForm.status === 'Confirm Order' || followUpForm.status === 'Order Confirmed') ? (
                    <div className="space-y-4 pt-2 border-t border-slate-800">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Configure Confirmed Order Settings</h4>
                      
                      {/* Read-only multiple events display */}
                      {selectedLead?.events && selectedLead.events.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <label className="block text-xs font-medium text-slate-400 mb-2">Confirmed Event Dates</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedLead.events.map(ev => (
                              <div key={ev.id} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex flex-col">
                                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">🎬 {ev.event_name || ev.event_type || 'Event'}</span>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-500 font-mono">Date:</span>
                                    <span className="text-[11px] text-slate-300 font-mono font-semibold">{ev.event_date || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-500 font-mono">Time:</span>
                                    <span className="text-[11px] text-slate-300 font-mono font-semibold">{ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Hidden inputs to preserve existing API requirements silently */}
                        <div className="hidden">
                          <label className="block text-xs font-medium text-slate-400 mb-1">Event Date * (Required)</label>
                          <input
                            type="date"
                            value={followUpForm.event_date || (selectedLead?.events?.[0]?.event_date) || ''}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, event_date: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                          />
                        </div>
                        <div className="hidden">
                          <label className="block text-xs font-medium text-slate-400 mb-1">Event Time * (Required)</label>
                          <input
                            type="time"
                            value={followUpForm.event_time || (selectedLead?.events?.[0]?.event_start_time) || ''}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, event_time: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
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
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Payment Tracking ID / Transaction Reference Number *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter Transaction Ref / Tracking ID (e.g. TXN12345678)"
                            value={followUpForm.transaction_id || ''}
                            onChange={(e) => setFollowUpForm({ ...followUpForm, transaction_id: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
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
                </fieldset>

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
                    disabled={isLeadLocked || isSaving}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all border ${
                      isLeadLocked || isSaving
                      ? 'bg-slate-800/80 text-slate-500 border-slate-800/50 cursor-not-allowed opacity-50'
                      : 'bg-indigo-650 hover:bg-indigo-550 text-white border-indigo-500/10 cursor-pointer text-shadow'
                    }`}
                  >
                    {isSaving ? 'Saving...' : (isLeadLocked ? '🔒 Locked' : followUpForm.status === 'Order Confirmed' ? '💍 Confirm Order booking' : 'Save Follow-up Notes')}
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
        {selectedLead ? null : activeTab === 'calendar' ? (
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
                        
                        <h4 className="text-xs font-black text-slate-100 mt-2 font-sans break-words">
                          {cust.customer_name}
                        </h4>
                        
                        <div className="text-[10px] text-slate-400 font-mono mt-1 space-y-0.5">
                          <div className="break-words">{cust.email}</div>
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
                          <div className={reorderForm.event_type === 'Other' ? "sm:col-span-2 space-y-2" : ""}>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Event Type</label>
                            <select
                              value={reorderForm.event_type}
                              onChange={(e) => setReorderForm({ ...reorderForm, event_type: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100"
                            >
                              {EVENT_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>

                            {reorderForm.event_type === 'Other' && (
                              <div className="animate-fade-in-down mt-2">
                                <label className="block text-[11px] font-mono font-bold text-amber-500 mb-1.5">
                                  Custom Event Type *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="Specify custom event type"
                                  value={reorderForm.custom_event_name}
                                  onChange={(e) => setReorderForm({ ...reorderForm, custom_event_name: e.target.value })}
                                  className="w-full bg-slate-950 border border-amber-500/50 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all text-white"
                                />
                              </div>
                            )}
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
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-amber-400 font-bold">{ld.lead_id}</span>
                                    <span className="text-[11px] text-slate-400">
                                      Source: {ld.lead_source === 'Other' && ld.Specify_Custom_Lead_Source_Name ? `Other: ${ld.Specify_Custom_Lead_Source_Name}` : ld.lead_source}
                                    </span>
                                  </div>
                                  
                                  {/* Render each event separately */}
                                  <div className="space-y-2 mt-2">
                                    {ld.events && ld.events.length > 0 ? ld.events.map((ev, evIdx) => (
                                      <div key={ev.id || evIdx} className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] text-slate-500 font-mono">📅 {ev.event_name || ev.event_type || 'Event'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                          <span className="text-slate-300">Date: {ev.event_date || 'N/A'}</span>
                                          <span className="text-slate-300">Time: {ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</span>
                                        </div>
                                      </div>
                                    )) : (
                                      <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] text-slate-500 font-mono">📅 {ld.event_type || 'Event'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                          <span className="text-slate-300">Date: {ld.event_date || 'N/A'}</span>
                                        </div>
                                      </div>
                                    )}
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
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-indigo-400 font-bold">{ord.order_id}</span>
                                  <span className="text-[11px] text-slate-400">
                                    Package: <strong className="text-slate-200">{ord.package_name}</strong> | Location: {ord.event_location}
                                  </span>
                                </div>

                                {/* Render each event separately */}
                                <div className="space-y-2 mt-2">
                                  {(() => {
                                    const ordLead = leads.find(l => l.lead_id === ord.lead_id);
                                    if (ordLead && ordLead.events && ordLead.events.length > 0) {
                                      return ordLead.events.map((ev, evIdx) => (
                                        <div key={ev.id || evIdx} className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] text-slate-500 font-mono">📅 {ev.event_name || ev.event_type || 'Event'}</span>
                                          </div>
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                            <span className="text-slate-300">Date: {ev.event_date || 'N/A'}</span>
                                            <span className="text-slate-300">Time: {ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</span>
                                          </div>
                                        </div>
                                      ));
                                    } else {
                                      return (
                                        <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[11px]">
                                            <span className="text-slate-300">Date: {ord.event_date || 'N/A'}</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                  })()}
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
                      category: 'Weddings', 
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
                    setPkgTeamMembers(['']);
                    setPkgDeliverablesList([]);
                    setPkgDeliverableInput('');
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

            {dbCategoryError && (
              <div id="db_category_error_banner" className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-400 font-medium space-y-1">
                <span className="font-bold flex items-center gap-1">⚠️ Database Schema Notice</span>
                <p>{dbCategoryError}</p>
              </div>
            )}

            {/* In-place Add / Edit Package Modal */}
            {(isAddFormOpen || editingPackage) && (
              <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-5 overflow-y-auto animate-fade-in text-left text-xs bg-black/70">
                <div id="add_edit_package_modal" className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl md:w-[90%] p-3.5 md:p-5 space-y-2.5 shadow-2xl relative text-slate-350">
                  <h4 className="text-sm font-bold text-slate-100 font-mono tracking-wide border-b border-slate-800 pb-2 flex items-center gap-2">
                    {editingPackage ? '✏️ Edit Service Package' : '✨ Define New Service Package'}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2.5 text-xs text-slate-300">
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

                    {/* Row 2: Package Price | Team Members Included */}
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
                      <label className="block text-slate-400 font-semibold mb-1">Team Members Included</label>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {pkgTeamMembers.map((member, index) => (
                          <div key={index} className="flex items-center gap-1.5 animate-slide-down">
                            <input
                              type="text"
                              placeholder="e.g. 2 Candid Photographers"
                              value={member}
                              onChange={(e) => {
                                const newList = [...pkgTeamMembers];
                                newList[index] = e.target.value;
                                setPkgTeamMembers(newList);
                              }}
                              className="flex-1 bg-slate-950 border border-slate-855 rounded-lg py-1 px-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newList = pkgTeamMembers.filter((_, idx) => idx !== index);
                                setPkgTeamMembers(newList.length > 0 ? newList : ['']);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-450 bg-slate-950 hover:bg-slate-900 border border-slate-855 hover:border-rose-900/30 rounded-lg transition-all cursor-pointer flex-shrink-0 animate-fade-in"
                              title="Remove item"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPkgTeamMembers([...pkgTeamMembers, ''])}
                        className="text-[10px] text-emerald-400 hover:text-emerald-350 font-semibold flex items-center gap-1 cursor-pointer transition-all hover:underline mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add More</span>
                      </button>
                    </div>

                    {/* Deliverables (Spanning both cols) */}
                    <div className="md:col-span-2">
                      <label className="block text-slate-400 font-semibold mb-1">Deliverables</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 2 Candid Photographers"
                          value={pkgDeliverableInput}
                          onChange={(e) => setPkgDeliverableInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (pkgDeliverableInput.trim()) {
                                const newDeliverables = [...pkgDeliverablesList, pkgDeliverableInput.trim()];
                                setPkgDeliverablesList(newDeliverables);
                                setPkgDeliverableInput('');
                                setPkgForm({ ...pkgForm, deliverables: newDeliverables.join('\n') });
                              }
                            }
                          }}
                          className="flex-1 bg-slate-950 border border-slate-855 rounded-lg py-1.5 px-3 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (pkgDeliverableInput.trim()) {
                              const newDeliverables = [...pkgDeliverablesList, pkgDeliverableInput.trim()];
                              setPkgDeliverablesList(newDeliverables);
                              setPkgDeliverableInput('');
                              setPkgForm({ ...pkgForm, deliverables: newDeliverables.join('\n') });
                            }
                          }}
                          className="px-4 py-1.5 text-[10px] bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-lg transition-all cursor-pointer font-medium border border-slate-700 uppercase tracking-wider whitespace-nowrap"
                        >
                          Add More
                        </button>
                      </div>
                      
                      {pkgDeliverablesList.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {pkgDeliverablesList.map((del, index) => (
                            <div key={index} className="flex items-center gap-2 animate-fade-in">
                              <span className="text-emerald-400 font-bold text-xs shrink-0">✓</span>
                              <input
                                type="text"
                                value={del}
                                onChange={(e) => {
                                  const newList = [...pkgDeliverablesList];
                                  newList[index] = e.target.value;
                                  setPkgDeliverablesList(newList);
                                  setPkgForm({ ...pkgForm, deliverables: newList.join('\n') });
                                }}
                                className="flex-1 bg-slate-950/50 border border-slate-855 rounded-lg py-1 px-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-sans text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newList = pkgDeliverablesList.filter((_, idx) => idx !== index);
                                  setPkgDeliverablesList(newList);
                                  setPkgForm({ ...pkgForm, deliverables: newList.join('\n') });
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-450 bg-slate-950 hover:bg-slate-900 border border-slate-855 hover:border-rose-900/30 rounded-lg transition-all cursor-pointer shrink-0"
                                title="Remove item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
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
                          category: 'Weddings', 
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
                        setPkgTeamMembers(['']);
                        setPkgDeliverablesList([]);
                        setPkgDeliverableInput('');
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
                        
                        const filteredMembers = pkgTeamMembers.map(item => item.trim()).filter(Boolean);
                        const teamMembersStr = filteredMembers.length > 0 ? JSON.stringify(filteredMembers) : '';

                        const payload = {
                          ...pkgForm,
                          team_members: teamMembersStr,
                          category: resolvedCategory
                        };
                        
                        try {
                          setIsSaving(true);
                          if (editingPackage) {
                            await updatePackage(editingPackage.package_id, payload);
                          } else {
                            await addPackage(payload);
                          }
                          setIsAddFormOpen(false);
                          setEditingPackage(null);
                          setPkgForm({ 
                            package_name: '', 
                            category: 'Weddings', 
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
                          setPkgTeamMembers(['']);
                          setPkgDeliverablesList([]);
                          setPkgDeliverableInput('');
                          setCustomCategory('');
                        } catch (err: any) {
                          alert(`Failed to save package: ${err.message || err}`);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      disabled={isSaving}
                      className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all cursor-pointer border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save Package'}
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
                  p => normalizeCategory(p.category) === cat && 
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
                            <p className="text-[11px] text-slate-400 break-words leading-snug">
                              {pkg.deliverables || 'No custom deliverables specified'}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 pt-2.5 border-t border-slate-900/80">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-emerald-400">₹{pkg.price.toLocaleString('en-IN')}</span>
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
                                      status: pkg.status as 'Active' | 'Inactive',
                                      deliverables: pkg.deliverables || '',
                                      team_members: pkg.team_members || '',
                                      seasonal_offer: pkg.seasonal_offer || '',
                                      terms_conditions: pkg.terms_conditions || '',
                                      event_type: pkg.event_type || '',
                                      duration: pkg.duration || '',
                                      package_includes: pkg.package_includes || ''
                                    });
                                    const parsed = parseTeamMembers(pkg.team_members);
                                    setPkgTeamMembers(parsed.length > 0 ? parsed : ['']);
                                    const parsedDel = pkg.deliverables ? pkg.deliverables.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean) : [];
                                    setPkgDeliverablesList(parsedDel);
                                    setPkgDeliverableInput('');
                                    setCustomCategory('');
                                    setIsAddFormOpen(true);
                                  }}
                                  className="py-1 px-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] uppercase font-mono tracking-tight font-bold border border-slate-800 hover:border-slate-700 rounded transition-all cursor-pointer text-center"
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
                                  className={`py-1 px-1 text-center text-[10px] uppercase font-mono tracking-tight font-bold border rounded transition-all cursor-pointer ${
                                    pkg.status === 'Active'
                                      ? 'bg-amber-500/10 border-amber-550/20 text-amber-500 hover:bg-amber-500/20'
                                      : 'bg-emerald-500/10 border-emerald-555/20 text-emerald-400 hover:bg-emerald-500/20'
                                  }`}
                                  title={pkg.status === 'Active' ? "Deactivate Package" : "Activate Package"}
                                >
                                  {pkg.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingPackageId(pkg.package_id);
                                  }}
                                  className="py-1 px-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-350 text-[10px] uppercase font-mono tracking-tight font-bold rounded transition-all cursor-pointer text-center"
                                  title="Delete Package"
                                >
                                  Delete
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
          /* SCREEN 2: Create Lead Layout as dedicated Full Page inside the application */
          <div 
            id="create_lead_form"
            className="bg-[#030303] border border-slate-800 rounded-2xl w-full shadow-2xl flex flex-col overflow-hidden relative h-[calc(100vh-220px)] min-h-[500px]"
          >
            {/* Header: Sticky */}
            <div className="border-b border-slate-800/80 py-2.5 px-4 sm:px-5 flex items-center justify-between shrink-0 bg-slate-950/40 backdrop-blur-md">
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-emerald-400">✍️</span> Create New Inbound Lead
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => { resetForm(); setActiveTab('list'); }}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-slate-700/50"
                title="Close Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {crmToast && (
              <div id="crm-create-toast-container" className={`mx-4 mt-4 p-3 rounded-xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shrink-0 ${
                crmToast.type === 'success' 
                  ? 'bg-emerald-950/90 border border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-950/90 border border-red-500/20 text-red-400'
              }`}>
                <span>{crmToast.type === 'success' ? '⚡' : '⚠️'}</span>
                <span className="text-[11px] font-mono font-bold whitespace-pre-wrap">{crmToast.message}</span>
              </div>
            )}

            {/* Wizard Progress Bar */}
            <div className="bg-slate-955/30 px-4 sm:px-6 py-1.5 border-b border-slate-800/50 shrink-0">
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                {[
                  { step: 1, label: 'Customer' },
                  { step: 2, label: 'Event Info' },
                  { step: 3, label: 'CRM & Quotation' }
                ].map((item) => {
                  const isActive = wizardStep === item.step;
                  const isCompleted = wizardStep > item.step;
                  return (
                    <div key={item.step} className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1">
                      <div className="w-full flex items-center gap-1">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black font-mono transition-all duration-300 ${
                          isActive 
                            ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/10' 
                            : isCompleted 
                              ? 'bg-emerald-500 text-slate-955' 
                              : 'bg-slate-800 text-slate-500'
                        }`}>
                          {isCompleted ? '✓' : item.step}
                        </span>
                        <div className={`hidden sm:block flex-1 h-0.5 rounded transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-slate-800'
                        }`} />
                      </div>
                      <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                        isActive ? 'text-cyan-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Body: Content Fields */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              
              {/* STEP 1: CUSTOMER DETAILS */}
              {wizardStep === 1 && (
                <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4 space-y-4 shadow-sm animate-fade-in">
                  <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                    <Users className="w-4 h-4 text-cyan-405" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">1. Customer Details</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Customer Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                        Customer Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={createForm.customer_name}
                        onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
                      />
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                        Mobile Number *
                      </label>
                      <input
                        id="input_mobile"
                        type="text"
                        required
                        placeholder="e.g. 9876543210"
                        value={createForm.mobile}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                          setCreateForm({ ...createForm, mobile: val });
                          if (val.length === 10) {
                            handleCheckExistingCustomer('phone', val);
                          }
                        }}
                        onBlur={(e) => handleCheckExistingCustomer('phone', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                      />
                    </div>

                    {/* WhatsApp Number */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-404">
                          WhatsApp Number
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (createForm.mobile) {
                              setCreateForm(prev => ({ ...prev, whatsapp_number: prev.mobile }));
                            }
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider cursor-pointer hover:underline"
                        >
                          Copy Mobile
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="WhatsApp contact number"
                        value={createForm.whatsapp_number}
                        onChange={(e) => setCreateForm({ ...createForm, whatsapp_number: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="customer@domain.com"
                        value={createForm.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateForm({ ...createForm, email: val });
                          if (val.includes('@') && val.length > 5 && (val.endsWith('.com') || val.endsWith('.in') || val.endsWith('.org'))) {
                            handleCheckExistingCustomer('email', val);
                          }
                        }}
                        onBlur={(e) => handleCheckExistingCustomer('email', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all font-sans"
                      />
                    </div>

                    {/* Lead Source */}
                    <div className="space-y-2 text-left">
                      <div>
                        <label className="block text-xs font-semibold text-slate-404 mb-1.5">
                          Inbound Lead Channel Source *
                        </label>
                        <select
                          value={createForm.lead_source}
                          required
                          onChange={(e) => setCreateForm({ ...createForm, lead_source: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all cursor-pointer"
                        >
                          <option value="">Select Lead Source</option>
                          {LEAD_SOURCES.map(source => (
                            <option key={source} value={source}>{source}</option>
                          ))}
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
                            placeholder="e.g. Billboard, Event Flyer"
                            value={otherSource}
                            onChange={(e) => setOtherSource(e.target.value)}
                            className="w-full bg-slate-955 border border-amber-500/50 rounded-lg py-2 px-3 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                          />
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* STEP 2: EVENT DETAILS */}
              {wizardStep === 2 && (
                <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm animate-fade-in text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1 text-left">
                    <Calendar className="w-4 h-4 text-cyan-405" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">2. Event Details</span>
                  </div>

                  {renderEventDetailsSection(false)}
                </div>
              )}

              {/* STEP 3: PACKAGE SELECTION */}
              {wizardStep === 3 && (
                <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm animate-fade-in text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                    <CheckSquare className="w-4 h-4 text-cyan-405" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">3. Package Selection</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Select Package Option *
                    </label>

                    <select
                      id="wizard_step3_first_field"
                      value={selectedPkgIds[0] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          setSelectedPkgIds([val]);
                        } else {
                          setSelectedPkgIds([]);
                        }
                      }}
                      className={`w-full bg-[#0F172A] border rounded-lg py-2.5 px-3.5 text-xs cursor-pointer focus:outline-none transition-all ${
                        selectedPkgIds.length === 0
                          ? 'border-rose-500/40 focus:border-rose-500 text-rose-300'
                          : 'border-slate-800 focus:border-emerald-600 text-white'
                      }`}
                    >
                      <option value="" className="text-slate-400">── Choose configuration package ──</option>
                      {PACKAGES_LIST.flatMap(cat => cat.items).map((pkg) => (
                        <option key={pkg.id} value={pkg.id} className="text-white bg-[#0F172A]">
                          {pkg.name} (₹{pkg.cost.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>

                    {selectedPkgIds.length === 0 && (
                      <p className="text-rose-450 font-bold text-xs mt-1.5 font-mono animate-pulse flex items-center gap-1.5">
                        ⚠️ Please select a package before continuing.
                      </p>
                    )}
                  </div>

                  {/* Selected Package Summary Panel with viewer + compare workflows */}
                  {selectedPkgIds.length > 0 && (
                    <div id="create_lead_pkg_summary_panel" className="bg-[#0F172A] border border-slate-800 rounded-xl p-4.5 space-y-4 animate-fade-in text-xs text-left">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-350">Selected Package</span>
                          <span className="bg-emerald-990/90 text-emerald-400 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border border-emerald-900/40">
                            {selectedPkgIds.length} Package
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
                                    {normalizeCategory(pkgObj.category)}
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
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex justify-between items-center gap-3 border-t border-slate-800/80 py-2 px-4 sm:px-5 bg-slate-950/40 backdrop-blur-md shrink-0">
              {/* Back or Cancel */}
              <div className="flex items-center gap-2">
                {wizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-4.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer border border-slate-850 hover:border-slate-700 transition-colors"
                  >
                    ← Back Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { resetForm(); setActiveTab('list'); }}
                    className="px-4.5 py-2 text-xs font-semibold bg-slate-805 hover:bg-slate-800 text-slate-300 rounded-xl cursor-pointer border border-slate-800 hover:border-slate-700/50 transition-colors"
                  >
                    Back
                  </button>
                )}
                {wizardStep === 2 && (!createdLeadId || leads.find(l => l.lead_id === createdLeadId)?.status === 'New Lead') && (
                  <div />
                )}
              </div>

              {/* Next or Save */}
              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={handleWizardNext}
                  disabled={isSaving || (wizardStep === 3 && selectedPkgIds.length === 0)}
                  className={`px-5.5 py-2 text-xs font-bold text-white rounded-xl shadow-lg border border-transparent transition-colors flex items-center gap-1.5 ${
                    wizardStep === 3 && selectedPkgIds.length === 0
                      ? 'bg-slate-800 text-slate-500 border border-slate-850 cursor-not-allowed opacity-50 shadow-none'
                      : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/10 cursor-pointer'
                  }`}
                >
                  {isSaving ? 'Processing...' : 'Save & Continue →'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    if (salesStatus === 'Order Confirmed') {
                      handleOrderConfirmedSubmit(e);
                    } else {
                      handleStatusSave();
                    }
                  }}
                  disabled={isSaving}
                  className="px-5.5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer border border-transparent transition-colors flex items-center gap-1.5"
                >
                  {isSaving ? 'Saving...' : salesStatus === 'Order Confirmed' ? '🎉 Confirm Order & Transition' : '✍️ Create Lead'}
                </button>
              )}
            </div>
          </div>
        ) : (
        /* SCREEN 1: Lead List datagrid */
        <div className="space-y-4">

          {/* Sales Performance Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-2">
            {[
              { label: 'Quote Sent', val: statQuotesSent, theme: 'purple' as CameraLensTheme, filterValue: 'Quote Sent', chartPoints: [12, 14, 18, 15, 21, 25, 22], trendText: 'Quotation Saved' },
              { label: 'Quote Follow-up', val: statQuoteFollowups, theme: 'gold' as CameraLensTheme, filterValue: 'Quote Follow-up', chartPoints: [5, 12, 8, 15, 10, 19, 14], trendText: 'Scheduled CRM' },
              { label: 'Confirm Order', val: statConfirmedOrders, theme: 'cyan' as CameraLensTheme, filterValue: 'Confirm Order', chartPoints: [8, 15, 12, 20, 16, 25, 24], trendText: 'To Operations' },
            ].map((card, idx) => (
              <CameraLensStatsCard
                key={idx}
                label={card.label}
                val={card.val}
                theme={card.theme}
                trendText={card.trendText}
                subText="SALES STATUS"
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
          <div className="bg-zinc-900/40 rounded-2xl border border-zinc-850 shadow-xl relative overflow-hidden">
            {/* Corner calibration tick marks */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-emerald-500/40" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-emerald-500/40" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-emerald-500/40" />
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-emerald-500/40" />

            {/* Mobile Toggle Button */}
            <div 
              className="md:hidden p-4 flex justify-between items-center cursor-pointer border-b border-zinc-800/50"
              onClick={() => setIsMobileFiltersExpanded(!isMobileFiltersExpanded)}
            >
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-2">📁 LEADS DIRECTORY</span>
              <button className="text-[10px] uppercase font-mono font-bold text-zinc-400 hover:text-zinc-200 transition-colors">
                {isMobileFiltersExpanded ? '▲ Hide Filters' : '▼ Show Filters'}
              </button>
            </div>

            {/* Filter Content */}
            <div 
              className={`grid transition-all duration-300 ease-in-out ${
                isMobileFiltersExpanded 
                  ? 'grid-rows-[1fr] opacity-100' 
                  : 'grid-rows-[0fr] opacity-0 md:grid-rows-[1fr] md:opacity-100'
              }`}
            >
              <div className="overflow-hidden">
                <div className="p-4 pt-0 md:pt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
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
                {LEAD_SOURCES.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
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
                className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-xs text-slate-100/90 font-sans cursor-pointer focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Stages</option>
                {ACTIVE_STAGE_GROUPS.map((group, idx) => (
                  <optgroup key={idx} label={group.label} className={`bg-slate-950 ${group.colorClass} font-bold`}>
                    {group.options.map(opt => (
                      <option key={opt.value} value={opt.value} className="text-white font-normal">{opt.label}</option>
                    ))}
                  </optgroup>
                ))}
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
              </div>
            </div>
          </div>

          {/* Table view */}
          <div className="bg-zinc-900/20 rounded-2xl border border-zinc-850 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1220px]">
                <thead>
                  <tr className="bg-zinc-950/70 text-zinc-405 font-bold border-b border-zinc-850 text-[10px] uppercase font-mono tracking-wider">
                    <th className="p-3.5 pl-5">Lead ID</th>
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">Customer Name</th>
                    <th className="p-3.5">Mobile Number</th>
                    <th className="p-3.5">Event Name</th>
                    <th className="p-3.5">Event Date</th>
                    <th className="p-3.5">Event Time</th>
                    <th className="p-3.5">Current Stage</th>
                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Payment Status</th>
                    <th className="p-3.5">Created Date</th>
                    <th className="p-3.5 text-right pr-5 w-[160px] min-w-[160px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => {
                      const leadStatus = getLeadCurrentStatus(lead);
                      const currentStage = getLeadCurrentStage(lead);
                      const isActiveInSales = currentStage === 'Sales';
                      const linkedOrder = orders.find((o) => o.lead_id === lead.lead_id);
                      const paymentRecord = linkedOrder ? payments.find((p) => p.order_id === linkedOrder.order_id) : null;
                      const paymentLabel = paymentRecord ? paymentRecord.payment_status : 'N/A';
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
                            {lead.customer_name === 'Inbound Prospect' ? '' : lead.customer_name}
                          </td>
                          <td className="p-3.5 font-mono text-zinc-400">
                            {formatIndianPhoneNumber(lead.mobile)}
                          </td>
                          <td className="p-3.5 text-zinc-300 font-sans">
                            <EventDropdownCell 
                              type="name" 
                              items={lead.events && lead.events.length > 0 ? lead.events.map((ev: any) => ev.event_name || '') : [lead.event_name || '']} 
                              events={lead.events}
                            />
                          </td>
                          <td className="p-3.5 font-mono text-zinc-350">
                            <EventDropdownCell 
                              type="date" 
                              items={lead.events && lead.events.length > 0 ? lead.events.map((ev: any) => ev.event_date || '—') : []} 
                            />
                          </td>
                          <td className="p-3.5 font-mono text-zinc-350">
                            <EventDropdownCell 
                              type="time" 
                              items={lead.events && lead.events.length > 0 ? lead.events.map((ev: any) => ev.event_start_time ? convertTo12Hour(ev.event_start_time) : '—') : []} 
                            />
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                              currentStage === 'Sales' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              currentStage === 'Operations' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                              currentStage === 'Production' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              {currentStage}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <StatusText status={leadStatus} />
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
                          <td className="p-3.5 text-right pr-5 w-[160px] min-w-[160px] overflow-visible relative">
                            {(() => {
                              const isManageCrmOnlyStatus = ['New Lead', 'Follow-up', 'Follow Up', 'Contacted'].includes(leadStatus);
                              const isActionsDropdownStatus = ['Negotiation', 'Quotation Sent'].includes(leadStatus);

                              if (isManageCrmOnlyStatus && isActiveInSales && canEdit) {
                                return (
                                  <div className="flex items-center justify-end gap-1.5 w-full">
                                    <button
                                      type="button"
                                      id={`btn_followup_${lead.lead_id}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectLead(lead);
                                      }}
                                      className="flex-1 h-8 px-2 text-xs font-bold bg-sky-950/30 hover:bg-sky-900/50 text-sky-400 hover:text-white rounded-xl border border-sky-900/50 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow"
                                    >
                                      <Edit className="w-3.5 h-3.5 shrink-0" />
                                      <span>{lead.status === 'Order Confirmed' ? 'View CRM' : 'Manage CRM'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      id={`btn_lost_lead_direct_${lead.lead_id}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdownLeadId(null);
                                        setSelectedLead(lead);
                                        setLostReason('');
                                        setOtherLostReason('');
                                        setLostNotes('');
                                        setShowLostModal(true);
                                      }}
                                      className="w-8 h-8 text-xs font-bold bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-white rounded-xl border border-rose-900/50 transition-all cursor-pointer inline-flex items-center justify-center shadow shrink-0"
                                      title="Mark as Lost Lead"
                                    >
                                      <X className="w-4 h-4 shrink-0" />
                                    </button>
                                  </div>
                                );
                              } else if (isActionsDropdownStatus && isActiveInSales && canEdit) {
                                return (
                                  <div className="relative inline-block text-left actions-dropdown-container">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (openDropdownLeadId === lead.lead_id) {
                                          setOpenDropdownLeadId(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const spaceBelow = window.innerHeight - rect.bottom;
                                          const spaceAbove = rect.top;
                                          const menuHeight = 130;
                                          
                                          let top: number | string = rect.bottom + 4;
                                          let bottom: number | string = 'auto';
                                          
                                          if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                                            top = 'auto';
                                            bottom = window.innerHeight - rect.top + 4;
                                          }
                                          
                                          setDropdownCoords({ top, right: window.innerWidth - rect.right, bottom });
                                          setOpenDropdownLeadId(lead.lead_id);
                                        }
                                      }}
                                      className="w-32 h-8 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white rounded-xl border border-zinc-850 transition-all cursor-pointer inline-flex items-center justify-between px-3 shadow shrink-0"
                                    >
                                      <span>⚡ Actions</span>
                                      <span className="text-[10px] ml-1">▼</span>
                                    </button>

                                    {openDropdownLeadId === lead.lead_id && createPortal(
                                      <div 
                                        className="fixed w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-[9999] p-1.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 text-left actions-dropdown-menu"
                                        style={{ top: dropdownCoords.top, right: dropdownCoords.right, bottom: dropdownCoords.bottom }}
                                      >
                                        {/* Manage CRM Option */}
                                        <button
                                          type="button"
                                          id={`btn_followup_${lead.lead_id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            handleSelectLead(lead);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white rounded-lg border border-zinc-850/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <Edit className="w-3.5 h-3.5 shrink-0" />
                                          <span>{lead.status === 'Order Confirmed' ? 'View CRM' : 'Manage CRM'}</span>
                                        </button>

                                        {/* Confirm Order Option */}
                                        <button
                                          type="button"
                                          id={`btn_confirm_order_direct_${lead.lead_id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const today = new Date().toISOString().split('T')[0];
                                            setConfirmForm({
                                              ...confirmForm,
                                              package_name: packages?.find((p) => String(p.package_id) === String(lead.Select_Package_Option))?.package_name || lead.Select_Package_Option || '',
                                              quotation_amount: Number(lead.Final_Quotation_Amount) || Number((lead as any).final_amount) || 0,
                                              advance_received: 0,
                                              event_date: lead.event_date || today,
                                              event_time: lead.event_time || ''
                                            });
                                            setOpenDropdownLeadId(null);
                                            handleSelectLead(lead);
                                            setShowConfirmModal(true);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-emerald-950 hover:bg-emerald-900 text-emerald-400 hover:text-white rounded-lg border border-emerald-900/30 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                                          <span>Confirm Order</span>
                                        </button>

                                        {/* Lost Lead Option */}
                                        <button
                                          type="button"
                                          id={`btn_lost_lead_direct_${lead.lead_id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            setSelectedLead(lead);
                                            setLostReason('');
                                            setOtherLostReason('');
                                            setLostNotes('');
                                            setShowLostModal(true);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-rose-950 hover:bg-rose-900 text-rose-400 hover:text-white rounded-lg border border-rose-900/30 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <X className="w-3.5 h-3.5 shrink-0" />
                                          <span>Lost Lead</span>
                                        </button>
                                      </div>,
                                      document.body
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <button
                                    type="button"
                                    id={`btn_followup_${lead.lead_id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectLead(lead);
                                    }}
                                    className="w-32 h-8 text-xs font-bold bg-purple-950/30 hover:bg-purple-900/50 text-purple-400 hover:text-white rounded-xl border border-purple-900/50 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow shrink-0"
                                  >
                                    <Eye className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                                    <span>View CRM</span>
                                  </button>
                                );
                              }
                            })()}
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
          <div id="confirm_booking_modal" className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-md w-full shadow-2xl p-5 space-y-4">
            
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
              <p className="text-slate-400">Type: <strong className="text-slate-200">{selectedLead.event_type === 'Other' ? (selectedLead.custom_event_name || selectedLead.custom_event_type || 'Other') : selectedLead.event_type}</strong></p>
              <p className="text-slate-400">Address: <strong className="text-slate-200">{selectedLead.event_location}</strong></p>
            </div>

            <form onSubmit={handleConfirmOrderSubmit} className="space-y-2.5 text-xs">
              
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
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1 px-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              {/* Event Date & Time Block */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Confirmed Event Dates</label>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 space-y-2">
                  {selectedLead?.events && selectedLead.events.length > 0 ? (
                    selectedLead.events.map((ev, i) => (
                      <div key={i} className="flex flex-col gap-0.5 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                        <span className="text-[11px] font-semibold text-amber-500">{ev.event_name || ev.event_type || 'Event'}</span>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">📅 {ev.event_date || 'TBD'}</span>
                          <span className="text-[10px] text-slate-400 font-mono">⏰ {ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'TBD'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-slate-500 text-center py-1">No events scheduled.</div>
                  )}
                </div>
                <input type="hidden" value={confirmForm.event_date || ''} />
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
                    readOnly
                    value={confirmForm.quotation_amount}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono opacity-80 cursor-not-allowed"
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

              {/* Payment Tracking ID / Transaction Reference Number */}
              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Payment Tracking ID / Transaction Reference Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter Payment Tracking ID / Reference Number (e.g. TXN12345678)"
                  value={confirmForm.transaction_id || ''}
                  onChange={(e) => setConfirmForm({ ...confirmForm, transaction_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
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
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/20 text-xs"
                >
                  <span>{isSaving ? 'Processing...' : 'Approve & Book Contract'}</span>
                  {!isSaving && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Final Reporting Details Popup */}
      {showFinalReportingModal && selectedLead && (
        <div className="fixed inset-0 bg-black/85 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
          <div id="final_reporting_modal" className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-md w-full shadow-2xl p-5 space-y-4">
             <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 font-sans">
                <span>⏰</span> Final Reporting Details
              </h4>
              <button 
                onClick={() => {
                  setShowFinalReportingModal(false);
                  setSelectedLead(null);
                }}
                className="text-slate-500 hover:text-slate-350 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleFinalReportingSubmit} className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-2">
              {(selectedLead.events && selectedLead.events.length > 0) ? (
                selectedLead.events.map((ev, idx) => {
                  const evData = finalReportingForm[ev.id] || { reporting_date: '', reporting_time: '' };
                  return (
                    <div key={ev.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-750 mb-3 space-y-3">
                      <h5 className="font-bold text-slate-200 border-b border-slate-700/50 pb-1.5 mb-2 flex items-center justify-between">
                        <span>Event {idx + 1}</span>
                      </h5>
                      
                      <div>
                        <label className="block font-medium text-slate-400 mb-1">
                          Event Name
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={ev.event_name || ''}
                          className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-2 text-slate-300 font-mono text-[11px] cursor-not-allowed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-slate-400 mb-1">
                            Event Date *
                          </label>
                          <input
                            type="date"
                            readOnly
                            value={ev.event_date || ''}
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-2 text-slate-300 font-mono text-[11px] cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-400 mb-1">
                            Event Start Time *
                          </label>
                          <input
                            type="time"
                            readOnly
                            value={ev.event_start_time || ev.event_time || ''}
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-1.5 px-2 text-slate-300 font-mono text-[11px] cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block font-medium text-slate-400 mb-1">
                            Reporting Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={evData.reporting_date}
                            onChange={(e) => setFinalReportingForm({ 
                              ...finalReportingForm, 
                              [ev.id]: { ...evData, reporting_date: e.target.value } 
                            })}
                            className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-400 mb-1">
                            Reporting End Date
                          </label>
                          <input
                            type="date"
                            readOnly
                            value={ev.event_end_date || ev.Event_End_Date || (selectedLead?.Event_End_Date && selectedLead?.events?.length === 1 ? selectedLead.Event_End_Date : '') || ''}
                            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg py-1.5 px-2 text-slate-300 font-mono text-[11px] cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-400 mb-1">
                            Reporting Time *
                          </label>
                          <input
                            type="time"
                            required
                            value={evData.reporting_time}
                            onChange={(e) => setFinalReportingForm({ 
                              ...finalReportingForm, 
                              [ev.id]: { ...evData, reporting_time: e.target.value } 
                            })}
                            className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">
                      Reporting Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={finalReportingForm['default']?.reporting_date || ''}
                      onChange={(e) => setFinalReportingForm({ 
                        ...finalReportingForm, 
                        'default': { ...finalReportingForm['default'], reporting_date: e.target.value } 
                      })}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-400 mb-1">
                      Reporting Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={finalReportingForm['default']?.reporting_time || ''}
                      onChange={(e) => setFinalReportingForm({ 
                        ...finalReportingForm, 
                        'default': { ...finalReportingForm['default'], reporting_time: e.target.value } 
                      })}
                      className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}
                
              <div className="flex justify-end pt-2 sticky bottom-0 bg-slate-850 pb-1">
                 <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-900/20 transition-all cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Reporting Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step 2 Mandatory Follow-up Popup Modal */}
      {showStep2Popup && (selectedLead || activeTab === 'create') && (
        <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4 backdrop-blur-md">
          <div id="step2_followup_modal" className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-md w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 font-sans">
                <span>📅</span> Log Mandatory Follow-up Details
              </h4>
              <button 
                onClick={() => setShowStep2Popup(false)}
                className="text-slate-500 hover:text-slate-350 cursor-pointer animate-none border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-200">
              Please schedule the next follow-up and add notes to progress the lead to <strong>Follow-up</strong> status.
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Next Follow-up Date * (Required)
                </label>
                <input
                  type="date"
                  required
                  value={step2FollowUpDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setStep2FollowUpDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Follow-up Notes * (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize the event discussion, client's vibe, key preferences..."
                  value={step2FollowUpNotes}
                  onChange={(e) => setStep2FollowUpNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStep2Popup(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer text-xs animate-none border-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStep2FollowUp}
                  disabled={isSaving || !step2FollowUpDate || !step2FollowUpNotes}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 text-white font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-lg text-xs border-0"
                >
                  {isSaving ? 'Saving...' : 'Save & Continue'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Details Modal */}
      {errorDetails && (
        <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-900/50 rounded-xl overflow-hidden max-w-lg w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h4 className="font-bold text-red-400 text-lg flex items-center gap-2">
                <span>❌</span> {errorDetails.title}
              </h4>
              <button 
                onClick={() => setErrorDetails(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <p><strong>Reason:</strong> {errorDetails.reason}</p>
              {errorDetails.source && <p><strong>Source:</strong> {errorDetails.source}</p>}
              {errorDetails.failedFunction && <p><strong>Failed Function:</strong> {errorDetails.failedFunction}</p>}
              {errorDetails.database && <p><strong>Database:</strong> {errorDetails.database}</p>}
              {errorDetails.leadId && <p><strong>Lead ID:</strong> {errorDetails.leadId}</p>}
              {errorDetails.suggestedFix && (
                <div className="mt-4 p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg text-blue-300">
                  <strong>Suggested Fix:</strong> {errorDetails.suggestedFix}
                </div>
              )}
              {process.env.NODE_ENV !== 'production' && errorDetails.stack && (
                <div className="mt-4 p-3 bg-slate-950 rounded-lg overflow-auto max-h-40 border border-slate-800 text-[10px] font-mono text-slate-500">
                  {errorDetails.stack}
                </div>
              )}
            </div>
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setErrorDetails(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lost Lead Popup Modal */}
      {showLostModal && selectedLead && (
        <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4 backdrop-blur-md">
          <div id="lost_lead_modal" className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-md w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 font-sans">
                <span>💔</span> Mark Lead as Lost
              </h4>
              <button 
                onClick={() => setShowLostModal(false)}
                className="text-slate-500 hover:text-slate-350 cursor-pointer animate-none border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-200">
              Please select a mandatory reason and log notes to set lead status to <strong>Lost</strong>.
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Lost Reason * (Required)
                </label>
                <select
                  required
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Select Reason --</option>
                  <option value="Budget Constraint">Budget Constraint</option>
                  <option value="Chose Competitor">Chose Competitor</option>
                  <option value="Event Cancelled / Postponed">Event Cancelled / Postponed</option>
                  <option value="No Response / Ghosted">No Response / Ghosted</option>
                  <option value="Desired Date Unavailable">Desired Date Unavailable</option>
                  <option value="Other">Other (Specify below)</option>
                </select>
              </div>

              {lostReason === 'Other' && (
                <div>
                  <label className="block font-medium text-slate-400 mb-1">
                    Specify Custom Lost Reason * (Required)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter custom lost reason..."
                    value={otherLostReason}
                    onChange={(e) => setOtherLostReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-400 mb-1">
                  Lost Notes * (Required)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the exact reason client decided otherwise..."
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLostModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer text-xs animate-none border-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLostLead}
                  disabled={isSaving || !lostReason || (lostReason === 'Other' && !otherLostReason) || !lostNotes}
                  className="px-4 py-2 bg-gradient-to-r from-red-650 to-rose-650 hover:from-red-600 hover:to-rose-600 disabled:opacity-50 text-white font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-lg text-xs border-0"
                >
                  {isSaving ? 'Processing...' : 'Mark as Lost'}
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lead Cancel Confirmation Modal */}
      {showCancelConfirmPopup && (
        <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div id="lead_cancel_confirm_modal" className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-sm w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 font-sans">
                <span>⚠️</span> Mark Lead as Lost
              </h4>
              <button 
                onClick={() => setShowCancelConfirmPopup(false)}
                className="text-slate-500 hover:text-slate-350 cursor-pointer animate-none border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm text-slate-300 py-2 text-left">
              Are you sure you want to mark this lead as Lost?
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirmPopup(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer text-xs font-semibold border-0"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleCancelLead}
                disabled={isSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl cursor-pointer shadow-lg text-xs border-0"
              >
                {isSaving ? 'Processing...' : 'Yes, Mark as Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedLead && (
        <div 
          id="lead_details_mobile_modal" 
          className="bg-[#030303] border border-slate-800 rounded-2xl w-full shadow-2xl flex flex-col overflow-hidden relative animate-fade-in text-left font-sans text-slate-100"
        >
            {/* Header: Sticky */}
            <div className="py-2.5 px-4 sm:px-5 border-b border-slate-850 flex items-center justify-between bg-slate-950/40 sticky top-0 z-10 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2 text-left">
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                  <span>💍</span> Digital Lead CRM Workspace — Client Board
                </h3>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono font-bold">Code: {selectedLead.lead_id}</span>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs rounded-xl border border-slate-700 font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1 shadow"
              >
                Back to Leads
              </button>
            </div>

            {/* Custom Toast Alert */}
            {crmToast && (
              <div id="crm-toast-container" className={`mx-4 mt-1.5 p-1.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 shrink-0 ${
                crmToast.type === 'success' 
                  ? 'bg-emerald-950 border border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-950 border border-red-500/20 text-red-400'
              }`}>
                <span>{crmToast.type === 'success' ? '⚡' : '⚠️'}</span>
                <span className="text-[11px] font-mono font-bold whitespace-pre-wrap">{crmToast.message}</span>
              </div>
            )}

            {/* Progress Bar & Indicators */}
            <div className="w-full bg-slate-950/20 border-b border-slate-850 py-1 px-4 sm:px-5 shrink-0 justify-start text-left">
              <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest text-left">
                    Step {crmWizardStep} of 3:
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-300 bg-slate-800 py-0.5 px-2 rounded border border-slate-750">
                    {crmWizardStep === 1 ? 'Customer Details' :
                     crmWizardStep === 2 ? 'Event Details' :
                     'Quotation Workspace'}
                  </span>
                </div>
                <div className="flex-1 max-w-xs h-1 bg-slate-950 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${(crmWizardStep / 3) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* If Lost Lead, display Lost Details */}
            {selectedLead && selectedLead.status === 'Lost Lead' && (
              <div className="mx-4 sm:mx-5 mt-2 bg-rose-950/25 border border-rose-500/20 p-2.5 rounded-xl flex items-start gap-3 text-left shadow-lg">
                <span className="text-rose-500 text-base mt-0.5">❌</span>
                <div>
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide">Lost Lead Information</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                    <strong>Reason:</strong> {selectedLead.Lost_Reason || 'N/A'} <br />
                    <strong>Notes:</strong> {selectedLead.Lost_Notes || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* Content container with horizontal padding */}
            <div id="crm-wizard-scroll-container" className="flex-1 overflow-y-auto p-2.5 sm:p-3">
              <div className="max-w-5xl mx-auto">
                <form onSubmit={(e) => e.preventDefault()} className="space-y-3">
                  {crmWizardStep === 1 && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="border-b border-slate-800 pb-1.5">
                        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                          <span className="p-0.5 px-1.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-mono">1</span>
                          <span>Customer Details</span>
                        </h3>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Manage client contact identity, email correspondence, and location parameters.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-left">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase font-mono tracking-wider">Customer Name (Optional)</label>
                          <input
                            type="text"
                            value={wizardLeadData.customer_name || ''}
                            onChange={(e) => setWizardLeadData({ ...wizardLeadData, customer_name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg py-1.5 px-3 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase font-mono tracking-wider">Mobile Number *</label>
                          <input
                            type="text"
                            value={wizardLeadData.mobile || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
                              setWizardLeadData({ ...wizardLeadData, mobile: val });
                            }}
                            className="w-full bg-slate-955 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg py-1.5 px-3 text-xs text-white font-mono"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase font-mono tracking-wider">WhatsApp Number</label>
                          <input
                            type="text"
                            value={wizardLeadData.whatsapp_number || ''}
                            onChange={(e) => setWizardLeadData({ ...wizardLeadData, whatsapp_number: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg py-1.5 px-3 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase font-mono tracking-wider">Email (Optional)</label>
                          <input
                            type="email"
                            value={wizardLeadData.email || ''}
                            onChange={(e) => setWizardLeadData({ ...wizardLeadData, email: e.target.value })}
                            className="w-full bg-slate-955 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg py-1.5 px-3 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase font-mono tracking-wider">Inbound Lead Channel Source *</label>
                          <select
                            value={wizardLeadData.lead_source || ''}
                            onChange={(e) => setWizardLeadData({ ...wizardLeadData, lead_source: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg py-1.5 px-3 text-xs text-white cursor-pointer select-element"
                            required
                          >
                            <option value="">── Choose Lead Source ──</option>
                            {LEAD_SOURCES.map(source => (
                              <option key={source} value={source}>{source}</option>
                            ))}
                          </select>
                          {wizardLeadData.lead_source === 'Other' && (
                            <div className="animate-fade-in-down mt-2">
                              <label className="block text-xs font-mono font-bold text-amber-500 mb-1.5">
                                Specify Custom Lead Source Name *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Billboard, Event Flyer"
                                value={wizardLeadData.Specify_Custom_Lead_Source_Name || ''}
                                onChange={(e) => setWizardLeadData({ ...wizardLeadData, Specify_Custom_Lead_Source_Name: e.target.value })}
                                className="w-full bg-slate-955 border border-amber-500/50 rounded-lg py-2 px-3 text-xs text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                              />
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                   )}

                   {crmWizardStep === 2 && (
                     <div className="space-y-4 animate-fade-in text-left">
                       <div className="border-b border-slate-800 pb-1.5">
                         <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                           <span className="p-0.5 px-1.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-mono">2</span>
                           <span>Event Details</span>
                         </h3>
                         <p className="text-[11px] text-zinc-400 mt-1">Configure event metadata, starting schedules, reporting times, and lead origins.</p>
                       </div>
                       
                       {renderEventDetailsSection(true)}
                     </div>
                   )}

                   {crmWizardStep === 3 && (
                     <div className="space-y-4 animate-fade-in text-left">
                       <div className="border-b border-slate-800 pb-1.5">
                         <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                           <span className="p-0.5 px-1.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-mono">3</span>
                           <span>Quotation Workspace</span>
                         </h3>
                         <p className="text-[10px] text-zinc-400 mt-0.5">Select from standard configured packages, customize team members and deliverables, adjust pricing, and generate the quotation.</p>
                       </div>
                       <div className="space-y-3.5 text-left">
                         <div>
                           <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase font-mono tracking-wider">Select Package Option *</label>
                           <select
                             id="select_package_option"
                             value={wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option || (selectedLead as any)?.selected_package_id || (leadPackages?.find(lp => lp.lead_id === selectedLead?.lead_id)?.package_id) || (quotations?.find(q => q.lead_id === selectedLead?.lead_id)?.package_id) || ''}
                             onChange={(e) => handlePackageChange(e.target.value)}
                             className={`w-full bg-slate-955 border focus:outline-none rounded-lg py-1.5 px-3 text-xs cursor-pointer ${
                               !(wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option)
                                 ? 'border-rose-500/40 focus:border-rose-500 text-rose-200'
                                 : 'border-slate-800 focus:border-indigo-500 text-white'
                             }`}
                           >
                             <option value="">── Choose configuration package ──</option>
                             {(() => {
                               const currentPkgId = wizardLeadData.Select_Package_Option || wizardLeadData.selected_package_id || selectedLead?.Select_Package_Option || (selectedLead as any)?.selected_package_id || (leadPackages?.find(lp => lp.lead_id === selectedLead?.lead_id)?.package_id) || (quotations?.find(q => q.lead_id === selectedLead?.lead_id)?.package_id) || '';
                               const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
                               const activePkgs = availablePkgs.filter(p => !p.status || p.status.toLowerCase() === 'active');
                               if (currentPkgId && !activePkgs.some(p => String(p.package_id) === String(currentPkgId))) {
                                 const matched = availablePkgs.find(p => String(p.package_id) === String(currentPkgId));
                                 if (matched) {
                                   activePkgs.unshift(matched);
                                 } else {
                                   activePkgs.unshift({
                                     package_id: currentPkgId,
                                     package_name: `Package ${currentPkgId} (Legacy)`,
                                     price: wizardLeadData.package_cost || selectedLead?.Final_Quotation_Amount || 0,
                                     status: 'Active'
                                   } as any);
                                 }
                               }
                               return activePkgs.map((pkg) => (
                                 <option key={pkg.package_id} value={pkg.package_id}>
                                   {pkg.package_name} (₹{Number(pkg.price).toLocaleString('en-IN')})
                                 </option>
                               ));
                             })()}
                           </select>
                           {!(wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option) && (
                             <p className="text-rose-450 font-bold text-xs mt-1 font-mono animate-pulse flex items-center gap-1.5">
                               ⚠️ Please select a package before continuing.
                             </p>
                           )}
                         </div>
 
                         {(() => {
                           const availablePkgs = (packages && packages.length > 0) ? packages : INITIAL_PACKAGES;
                           const currentPkgId = wizardLeadData.selected_package_id || wizardLeadData.Select_Package_Option; let selectedPkg = availablePkgs.find(p => String(p.package_id) === String(currentPkgId)); if (!selectedPkg && currentPkgId) { selectedPkg = { package_id: currentPkgId, package_name: `Package ${currentPkgId} (Legacy)`, price: wizardLeadData.package_cost || 0, deliverables: wizardLeadData.deliverables || "", status: "Active" } as any; }
                           if (!selectedPkg) return null;

                          const selectedPkgId = selectedPkg.package_id;
                          const inclusionsList = editableInclusions[selectedPkgId] || [];
                          const deliverablesList = editableDeliverables[selectedPkgId] || [];

                          return (
                            <div className="space-y-4 animate-fade-in">
                              {/* Sales Executive Details */}
                              <div className="bg-slate-900/50 border border-slate-805/40 rounded-lg p-3 space-y-2.5 shadow-sm mt-3">
                                <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide font-mono flex items-center gap-1.5 border-b border-slate-800 pb-1">
                                  <span>👤</span> Sales Executive Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                                      Sales Staff Name *
                                    </label>
                                    <input
                                      id="input_sales_staff_name"
                                      type="text"
                                      required
                                      value={salesStaffName}
                                      onChange={(e) => setSalesStaffName(e.target.value)}
                                      placeholder="E.g., Jane Doe"
                                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-sans transition-all"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                                      Sales Staff Mobile Number *
                                    </label>
                                    <input
                                      id="input_sales_staff_mobile"
                                      type="text"
                                      required
                                      value={salesStaffMobile}
                                      onChange={(e) => setSalesStaffMobile(e.target.value)}
                                      placeholder="E.g., 9876543210"
                                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg py-1.5 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 font-mono transition-all"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 hidden">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-450 mb-1 uppercase font-mono tracking-wider">Package Name</label>
                                  <input
                                    type="text"
                                    value={selectedPkg.package_name || ''}
                                    disabled
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-400 font-medium cursor-not-allowed"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-455 mb-1 uppercase font-mono tracking-wider">Package Category</label>
                                  <input
                                    type="text"
                                    value={normalizeCategory(selectedPkg.category) || 'Wedding'}
                                    disabled
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-400 font-medium cursor-not-allowed"
                                  />
                                </div>
                              </div>

                              <div className="hidden">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase font-mono tracking-wider">Package Price (Editable) *</label>
                                <input
                                  type="number"
                                  value={wizardLeadData.package_cost !== undefined ? wizardLeadData.package_cost : selectedPkg.price}
                                  onChange={(e) => setWizardLeadData({ ...wizardLeadData, package_cost: Math.max(0, parseInt(e.target.value) || 0) })}
                                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg py-1.5 px-3 text-xs text-amber-400 font-mono font-bold"
                                  required
                                />
                              </div>

                              <div>
                                {crmEvents && crmEvents.length > 0 ? (
                                  crmEvents.map((event) => {
                                    const eventKey = `${selectedPkgId}_${event.id}`;
                                    const nameKey = `${selectedPkgId}_${event.event_name || event.event_type || 'Unnamed Event'}`;
                                    const eventInclusions = editableInclusions[eventKey] !== undefined
                                      ? editableInclusions[eventKey]
                                      : (editableInclusions[nameKey] !== undefined ? editableInclusions[nameKey] : inclusionsList);

                                    return (
                                      <div key={event.id} className="bg-slate-900/25 border border-slate-800/60 p-4 rounded-xl space-y-3 mt-3 mb-4">
                                        <div className="border-b border-slate-800/40 pb-2 mb-3">
                                          <div className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center justify-between mb-1">
                                            <span>Event Name: {event.event_name || event.event_type || 'Unnamed Event'}</span>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="flex items-center justify-between mb-2">
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                                              Team Members Included (Editable)
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentList = [...(editableInclusions[eventKey] !== undefined ? editableInclusions[eventKey] : (editableInclusions[nameKey] !== undefined ? editableInclusions[nameKey] : inclusionsList))];
                                                currentList.push('');
                                                const updated = {
                                                  ...editableInclusions,
                                                  [eventKey]: currentList,
                                                  [nameKey]: currentList
                                                };
                                                setEditableInclusions(updated);
                                                saveStep3DataRealtime(updated, editableDeliverables);
                                              }}
                                              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 px-2 py-0.5 rounded transition-all cursor-pointer"
                                            >
                                              + Add Member
                                            </button>
                                          </div>
                                          {eventInclusions.length === 0 ? (
                                            <p className="text-[10px] text-zinc-500 italic">No team members added yet.</p>
                                          ) : (
                                            <div className="space-y-2">
                                              {eventInclusions.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                  <LocalEditableInput
                                                    value={item}
                                                    onChange={(newVal) => {
                                                      const currentList = [...(editableInclusions[eventKey] !== undefined ? editableInclusions[eventKey] : (editableInclusions[nameKey] !== undefined ? editableInclusions[nameKey] : inclusionsList))];
                                                      currentList[idx] = newVal;
                                                      const updated = {
                                                        ...editableInclusions,
                                                        [eventKey]: currentList,
                                                        [nameKey]: currentList
                                                      };
                                                      setEditableInclusions(updated);
                                                      saveStep3DataRealtime(updated, editableDeliverables);
                                                    }}
                                                    className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const currentList = [...(editableInclusions[eventKey] !== undefined ? editableInclusions[eventKey] : (editableInclusions[nameKey] !== undefined ? editableInclusions[nameKey] : inclusionsList))];
                                                      currentList.splice(idx, 1);
                                                      const updated = {
                                                        ...editableInclusions,
                                                        [eventKey]: currentList,
                                                        [nameKey]: currentList
                                                      };
                                                      setEditableInclusions(updated);
                                                      saveStep3DataRealtime(updated, editableDeliverables);
                                                    }}
                                                    className="text-red-400 hover:text-red-350 p-1 px-2 hover:bg-red-500/10 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer"
                                                  >
                                                    Remove
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Team Members Included (Editable)</label>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentList = [...(editableInclusions[selectedPkgId] || [])];
                                          currentList.push('');
                                          const updated = {
                                            ...editableInclusions,
                                            [selectedPkgId]: currentList
                                          };
                                          setEditableInclusions(updated);
                                          saveStep3DataRealtime(updated, editableDeliverables);
                                        }}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 px-2 py-0.5 rounded"
                                      >
                                        + Add Member
                                      </button>
                                    </div>
                                    {inclusionsList.length === 0 ? (
                                      <p className="text-[10px] text-zinc-500 italic">No team members added yet.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {inclusionsList.map((item, idx) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <LocalEditableInput
                                              value={item}
                                              onChange={(newVal) => {
                                                const currentList = [...(editableInclusions[selectedPkgId] || [])];
                                                currentList[idx] = newVal;
                                                const updated = {
                                                  ...editableInclusions,
                                                  [selectedPkgId]: currentList
                                                };
                                                setEditableInclusions(updated);
                                                saveStep3DataRealtime(updated, editableDeliverables);
                                              }}
                                              className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const currentList = [...(editableInclusions[selectedPkgId] || [])];
                                                currentList.splice(idx, 1);
                                                const updated = {
                                                  ...editableInclusions,
                                                  [selectedPkgId]: currentList
                                                };
                                                setEditableInclusions(updated);
                                                saveStep3DataRealtime(updated, editableDeliverables);
                                              }}
                                              className="text-red-400 hover:text-red-350 p-1 px-2 hover:bg-red-500/10 rounded-lg text-xs font-bold font-mono"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">Deliverables Description / Base Package Deliverables (Editable)</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentList = [...(editableDeliverables[selectedPkgId] || [])];
                                      currentList.unshift('');
                                      const updated = {
                                        ...editableDeliverables,
                                        [selectedPkgId]: currentList
                                      };
                                      setEditableDeliverables(updated);
                                      saveStep3DataRealtime(editableInclusions, updated);
                                    }}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold font-mono bg-indigo-500/10 px-2 py-0.5 rounded"
                                  >
                                    + Add Deliverable
                                  </button>
                                </div>
                                {deliverablesList.length === 0 ? (
                                  <p className="text-[10px] text-zinc-500 italic">No deliverables added yet.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {deliverablesList.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-2">
                                        <LocalEditableInput
                                          value={item}
                                          onChange={(newVal) => {
                                            const currentList = [...(editableDeliverables[selectedPkgId] || [])];
                                            currentList[idx] = newVal;
                                            const updated = {
                                              ...editableDeliverables,
                                              [selectedPkgId]: currentList
                                            };
                                            setEditableDeliverables(updated);
                                            saveStep3DataRealtime(editableInclusions, updated);
                                          }}
                                          className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:outline-none rounded-xl py-1.5 px-3 text-xs text-slate-100"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentList = [...(editableDeliverables[selectedPkgId] || [])];
                                            currentList.splice(idx, 1);
                                            const updated = {
                                              ...editableDeliverables,
                                              [selectedPkgId]: currentList
                                            };
                                            setEditableDeliverables(updated);
                                            saveStep3DataRealtime(editableInclusions, updated);
                                          }}
                                          className="text-red-400 hover:text-red-350 p-1 px-2 hover:bg-red-500/10 rounded-lg text-xs font-bold font-mono"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 flex justify-end pb-2">
                                <button
                                  type="button"
                                  onClick={handleSavePackageOnly}
                                  disabled={isSaving}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded-lg shadow transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSaving ? 'Saving...' : 'Save Package'}
                                </button>
                              </div>

                              {isPackageDetailsSaved && renderQuotationAndStep4Section(true)}
                            </div>
                          );
                        })()}
                      </div>

                      {/* STEP 5 INTEGRATED (CRM): Status Update / Order Confirmation Details at BOTTOM of Step 3 */}
                      <div className="space-y-4 animate-fade-in text-left mt-6">
                        <div className="border-b border-slate-800 pb-1.5">
                          <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                            <span className="p-0.5 px-1.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-mono">4</span>
                            <span>Status Update</span>
                          </h3>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Determine final CRM pipeline stages or transition the contract to Operations.</p>
                        </div>
                        <div className="space-y-4 text-left">
                          {(['Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed', 'Raw Footage Received', 'Editing Started', 'Client Review', 'Editing Complete', 'Completed'].includes(wizardLeadData.status || selectedLead?.status || '') || selectedLead?.booking_status === 'Confirmed' || !!orders?.find(o => o.lead_id === selectedLead?.lead_id)) ? (
                            (selectedLead?.status === 'Order Confirmed' || selectedLead?.status === 'Event Scheduled' || selectedLead?.booking_status === 'Confirmed' || !!orders?.find(o => o.lead_id === selectedLead?.lead_id)) ? (
                              <div id="configure_confirmed_order_section" className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
                                <div className="border-b border-emerald-500/20 pb-1.5">
                                  <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest font-mono">💍 Order Confirmation Details</h4>
                                  <p className="text-[10px] text-zinc-400 mt-0.5">These are the finalized details saved for this order from the database.</p>
                                </div>
                                
                                <div className="hidden">
                                  <input type="text" value={selectedLead?.booking_date || selectedLead?.event_date || wizardLeadData.confirmed_event_date || ''} onChange={() => {}} />
                                  <input type="number" value={selectedLead?.final_package_amount || selectedLead?.Final_Quotation_Amount || wizardLeadData.final_amount || 0} onChange={() => {}} />
                                  <input type="number" value={selectedLead?.advance_collected || wizardLeadData.advance_received || 0} onChange={() => {}} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left text-xs">
                                  <div>
                                    <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Order Status</span>
                                    <strong className="text-emerald-400">Order Confirmed</strong>
                                  </div>
                                  
                                  <div className="col-span-1 sm:col-span-2 space-y-2 mb-2">
                                    {crmEvents && crmEvents.length > 0 ? (
                                      crmEvents.map((ev: any, idx: number) => (
                                        <div key={ev.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                          <div className="flex flex-col min-w-[150px]">
                                            <span className="text-[10px] text-amber-500 font-black uppercase tracking-wider mb-0.5">Event {idx + 1}</span>
                                            <span className="text-xs font-bold text-slate-200">{ev.event_name || ev.event_type || 'N/A'}</span>
                                          </div>
                                          <div className="flex gap-4">
                                            <div>
                                              <span className="block text-[9px] text-zinc-500 uppercase font-mono font-bold">Booking Date</span>
                                              <strong className="text-slate-300 text-xs font-mono">{ev.event_date || 'N/A'}</strong>
                                            </div>
                                            <div>
                                              <span className="block text-[9px] text-zinc-500 uppercase font-mono font-bold">Booking Time</span>
                                              <strong className="text-slate-300 text-xs font-mono">{ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</strong>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div>
                                        <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Booking Date & Time</span>
                                        <strong className="text-slate-200">{selectedLead?.booking_date || 'N/A'} {selectedLead?.booking_time ? `at ${selectedLead.booking_time}` : ''}</strong>
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Final Package Amount</span>
                                    <strong className="text-amber-400 font-mono">₹{Number(selectedLead?.final_package_amount || selectedLead?.Final_Quotation_Amount || wizardLeadData.final_amount || 0).toLocaleString('en-IN')}</strong>
                                  </div>
                                  <div>
                                    <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Advance Payment</span>
                                    <strong className="text-emerald-400 font-mono">₹{Number(selectedLead?.advance_collected || wizardLeadData.advance_received || 0).toLocaleString('en-IN')}</strong>
                                  </div>
                                  <div>
                                    <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Payment Mode</span>
                                    <strong className="text-slate-200">{selectedLead?.payment_mode || 'N/A'}</strong>
                                  </div>
                                  <div>
                                    <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Transaction ID</span>
                                    <strong className="text-slate-200">
                                      {(selectedLead?.payment_mode === 'Cash' || selectedLead?.payment_mode === 'Other') ? 'N/A' : (selectedLead?.transaction_id || payments?.find(p => p.order_id === (orders?.find(o => o.lead_id === selectedLead?.lead_id)?.order_id || selectedLead?.lead_id))?.transaction_id || 'N/A')}
                                    </strong>
                                  </div>
                                  <div className="col-span-1 sm:col-span-2">
                                    <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Booking Notes</span>
                                    <p className="text-slate-300 whitespace-pre-wrap">{selectedLead?.contract_notes || 'No extra notes'}</p>
                                  </div>
                                </div>

                                {crmEvents && crmEvents.length > 0 && (
                                  <div className="mt-4 space-y-3">
                                    <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono border-b border-emerald-500/20 pb-1.5">Event-wise Details</h5>
                                    {crmEvents.map((ev: any) => (
                                      <div key={ev.id} className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                        <div className="col-span-1 sm:col-span-4">
                                          <span className="text-xs font-bold text-slate-200">🎬 {ev.event_name || ev.event_type}</span>
                                        </div>
                                        <div>
                                           <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Event Date</span>
                                           <strong className="text-slate-300 font-mono">{ev.event_date || 'N/A'}</strong>
                                        </div>
                                        <div>
                                           <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Reporting Date</span>
                                           <strong className="text-slate-300 font-mono">{ev.reporting_date || ev.event_date || 'N/A'}</strong>
                                        </div>
                                        <div>
                                           <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Reporting End Date</span>
                                           <strong className="text-slate-300 font-mono">{ev.event_end_date || ev.Event_End_Date || (crmEvents.length === 1 && selectedLead?.Event_End_Date ? selectedLead.Event_End_Date : 'N/A')}</strong>
                                        </div>
                                        <div>
                                           <span className="block text-[10px] text-zinc-500 uppercase font-mono font-bold mb-0.5">Reporting Time</span>
                                           <strong className="text-slate-300 font-mono">{ev.reporting_time || 'N/A'}</strong>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-center justify-between text-xs mt-4">
                                  <div>
                                    <span className="text-[10px] text-zinc-555 uppercase font-bold font-mono">Calculated Pending Amount</span>
                                    <strong className="block text-red-500 text-sm font-mono mt-0.5">
                                      ₹{(Number(selectedLead?.final_package_amount || selectedLead?.Final_Quotation_Amount || wizardLeadData.final_amount || 0) - Number(selectedLead?.advance_collected || wizardLeadData.advance_received || 0)).toLocaleString('en-IN')}
                                    </strong>
                                  </div>
                                  {(Number(selectedLead?.final_package_amount || selectedLead?.Final_Quotation_Amount || wizardLeadData.final_amount || 0) - Number(selectedLead?.advance_collected || wizardLeadData.advance_received || 0)) > 0 ? (
                                    <span className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded uppercase font-bold font-mono">Payment Pending</span>
                                  ) : (
                                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-bold font-mono">Fully Paid</span>
                                  )}
                                </div>
                              </div>
                            ) : (

                            <div id="configure_confirmed_order_section" className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
                              <div className="border-b border-emerald-500/20 pb-1.5">
                                <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest font-mono">💍 Configure Confirmed Order & Booking Contract</h4>
                                <p className="text-[10px] text-zinc-400 mt-0.5">Confirming this order locks the CRM profile and creates a real-time production entry. Only payment configurations remain editable.</p>
                              </div>

                              {/* Display each event separately */}
                              {crmEvents && crmEvents.length > 0 && (
                                <div className="space-y-2 mb-4">
                                  <label className="block text-[10px] text-zinc-400 mb-2 uppercase font-mono font-bold border-b border-zinc-800 pb-1">Confirmed Event Dates</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {crmEvents.map(ev => (
                                      <div key={ev.id} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-0.5">🎬 {ev.event_name || ev.event_type || 'Event'}</span>
                                          <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[10px] text-slate-500 font-mono">Date:</span>
                                              <span className="text-[11px] text-slate-300 font-mono font-semibold">{ev.event_date || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[10px] text-slate-500 font-mono">Time:</span>
                                              <span className="text-[11px] text-slate-300 font-mono font-semibold">{ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
                                {/* Hidden input to preserve business logic without confusing the UI */}
                                <div className="hidden">
                                  <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-mono font-bold">Confirmed Event Date *</label>
                                  <input
                                    id="input_confirmed_event_date"
                                    type="date"
                                    value={wizardLeadData.confirmed_event_date || (crmEvents && crmEvents.length > 0 ? crmEvents[0].event_date : '') || ''}
                                    onChange={(e) => setWizardLeadData({ ...wizardLeadData, confirmed_event_date: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white font-mono"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-mono font-bold">Contract Final Amount (₹) *</label>
                                  <input
                                    id="input_final_amount"
                                    type="number"
                                    value={wizardLeadData.final_amount || 0}
                                    onChange={(e) => setWizardLeadData({ ...wizardLeadData, final_amount: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-amber-400 font-mono font-bold"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-mono font-bold">Advance Payment Received (₹) *</label>
                                  <input
                                    id="input_advance_received"
                                    type="number"
                                    value={wizardLeadData.advance_received || 0}
                                    onChange={(e) => setWizardLeadData({ ...wizardLeadData, advance_received: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-emerald-400 font-mono font-bold"
                                    required
                                  />
                                </div>
                                
                                {crmEvents && crmEvents.length > 0 && (
                                  <div className="col-span-1 sm:col-span-2 mt-4 space-y-3">
                                    <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono border-b border-emerald-500/20 pb-1.5">Event-wise Reporting Details</h5>
                                    {crmEvents.map(ev => {
                                      const repEndDate = ev.event_end_date || ev.Event_End_Date || (crmEvents.length === 1 && selectedLead?.Event_End_Date ? selectedLead.Event_End_Date : '');
                                      return (
                                        <div key={ev.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                          <div className="col-span-1 sm:col-span-3"><span className="text-xs font-bold text-slate-200">🎬 {ev.event_name || ev.event_type}</span></div>
                                          <div>
                                             <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-mono font-bold">Reporting Date *</label>
                                             <input 
                                               id={`reporting_date_${ev.id}`}
                                               type="date" 
                                               value={ev.reporting_date || ev.event_date || ''} 
                                               onChange={(e) => {
                                                 const updated = crmEvents.map(eItem => eItem.id === ev.id ? { ...eItem, reporting_date: e.target.value } : eItem);
                                                 setCrmEvents(updated);
                                               }} 
                                               className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white font-mono"
                                               required 
                                             />
                                          </div>
                                          <div>
                                             <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-mono font-bold">Reporting End Date</label>
                                             <input 
                                               id={`reporting_end_date_${ev.id}`}
                                               type="date" 
                                               value={repEndDate} 
                                               readOnly
                                               placeholder="N/A"
                                               className="w-full bg-slate-950/60 border border-slate-850/80 rounded-lg py-1.5 px-3 text-xs text-slate-300 font-mono cursor-not-allowed"
                                             />
                                          </div>
                                          <div>
                                             <label className="block text-[10px] text-zinc-400 mb-1 uppercase font-mono font-bold">Reporting Time *</label>
                                             <input 
                                               id={`reporting_time_${ev.id}`}
                                               type="time" 
                                               value={ev.reporting_time || ''} 
                                               onChange={(e) => {
                                                 const updated = crmEvents.map(eItem => eItem.id === ev.id ? { ...eItem, reporting_time: e.target.value } : eItem);
                                                 setCrmEvents(updated);
                                               }} 
                                               className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-white font-mono"
                                               required 
                                             />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-[10px] text-zinc-550 uppercase font-bold font-mono">Calculated Pending Amount</span>
                                  <strong className="block text-red-500 text-sm font-mono mt-0.5">₹{((wizardLeadData.final_amount || 0) - (wizardLeadData.advance_received || 0)).toLocaleString('en-IN')}</strong>
                                </div>
                                <span className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded uppercase font-bold font-mono">Payment Pending</span>
                              </div>
                            </div>
                            )
                          ) : (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
                              <span className="text-slate-500 text-xs font-mono">No Order Confirmation Details Available.</span>
                            </div>
                          )}
                        </div>
                      </div>
                     </div>
                   )}
                </form>
              </div>
            </div>

            {/* Footer Buttons: Sticky */}
            <div className="py-1 px-4 sm:px-5 border-t border-slate-850 flex items-center justify-between bg-slate-950/40 sticky bottom-0 z-10 shrink-0 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                {crmWizardStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCrmWizardStep(crmWizardStep - 1)}
                    className="px-3.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-mono font-bold uppercase rounded transition-all cursor-pointer border border-slate-705 border-0"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="px-3.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-mono font-bold uppercase rounded transition-all cursor-pointer border border-slate-705 border-0"
                  >
                    Back
                  </button>
                )}
                {crmWizardStep === 2 && selectedLead?.status === 'Order Confirmed' && (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirmPopup(true)}
                    className="px-3.5 py-1 text-xs font-mono font-bold uppercase bg-rose-600 hover:bg-rose-500 text-white rounded transition-all cursor-pointer border border-transparent shadow-lg shadow-rose-600/15"
                  >
                    Lost Lead
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveStep(crmWizardStep)}
                  disabled={isSaving || (crmWizardStep === 3 && (!wizardLeadData.selected_package_id || wizardLeadData.selected_package_id.trim() === ''))}
                  className={`px-4 py-1 text-xs font-mono font-bold uppercase rounded transition-all shadow-md flex items-center gap-1.5 border-0 ${
                    crmWizardStep === 3 && (!wizardLeadData.selected_package_id || wizardLeadData.selected_package_id.trim() === '')
                      ? 'bg-slate-800 text-slate-500 border border-slate-850 cursor-not-allowed opacity-50 shadow-none'
                      : 'bg-indigo-650 hover:bg-indigo-600 text-white cursor-pointer'
                  }`}
                >
                  {isSaving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  ) : null}
                  <span>{isSaving ? 'Saving...' : crmWizardStep === 3 ? 'Save & Proceed' : 'Save & Next'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {saveErrorPopup && (
        <div id="save_error_popup" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold font-mono">
              ❌
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {saveErrorPopup.title}
              </h3>
              <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
                {saveErrorPopup.message}
              </p>
            </div>
            <button
              onClick={() => setSaveErrorPopup(null)}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase rounded-lg transition-all border-0 shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Proceed Status Pop-up */}
      {showStep3Popup && (
        <div id="modal_step3_proceed_status" className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl w-full max-w-md shadow-2xl relative p-6 space-y-5">
            <div className="absolute top-0 left-12 w-48 h-48 bg-indigo-500/[0.03] rounded-full blur-[60px] pointer-events-none" />

            <div className="flex items-start justify-between border-b border-slate-800 pb-3 relative z-10">
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest font-mono flex items-center gap-1.5 animate-pulse">
                  <span>STATUS</span>
                </h3>
                <p className="text-[11px] text-indigo-300 mt-0.5 font-sans">
                  How would you like to proceed?
                </p>
              </div>
              <button 
                onClick={() => setShowStep3Popup(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 relative z-10 text-slate-300">
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-950/20 hover:bg-slate-950/40 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="step3Option"
                    value="negotiation"
                    checked={step3Option === 'negotiation'}
                    onChange={() => setStep3Option('negotiation')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-750 bg-slate-900 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-white">Mark as Negotiation</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">Update lead status to Negotiation and return to Leads Directory.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-950/20 hover:bg-slate-950/40 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="step3Option"
                    value="quotation_send"
                    checked={step3Option === 'quotation_send'}
                    onChange={() => setStep3Option('quotation_send')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-750 bg-slate-900 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-white">Quotation Sent</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">Update lead status to Quotation Sent and return to Leads Directory.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80 relative z-10">
              <button
                onClick={() => setShowStep3Popup(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-mono font-bold uppercase transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStep3Proceed}
                disabled={isSaving}
                className="px-4 py-1.5 rounded bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-mono font-bold uppercase transition-all shadow-md flex items-center gap-1.5"
              >
                {isSaving && <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>}
                <span>Continue</span>
              </button>
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
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 font-mono text-[9px] uppercase">
                    <th className="p-2 border border-slate-800">Customer Name</th>
                    <th className="p-2 border border-slate-800">Phone Number</th>
                    <th className="p-2 border border-slate-800">Lead Created Date</th>
                    <th className="p-2 border border-slate-800">Current Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-950/40 text-slate-300">
                    <td className="p-2 border border-slate-800 font-bold">{detectedCustomer.customer_name}</td>
                    <td className="p-2 border border-slate-800 font-mono">{detectedCustomer.mobile}</td>
                    <td className="p-2 border border-slate-800 font-mono">
                      {detectedCustomer.leads && detectedCustomer.leads.length > 0 
                        ? new Date(Math.max(...detectedCustomer.leads.map((l: any) => new Date(l.created_date || 0).getTime()))).toISOString().split('T')[0]
                        : 'N/A'}
                    </td>
                    <td className="p-2 border border-slate-800">
                      {detectedCustomer.leads && detectedCustomer.leads.length > 0
                        ? getLeadCurrentStatus(detectedCustomer.leads.sort((a: any, b: any) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime())[0])
                        : 'N/A'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 p-1 border-t border-slate-800 mt-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowDetectionPopup(false);
                  setDetectedCustomer(null);
                  setActiveTab('list');
                }}
                className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-755 text-slate-200 border border-slate-700 rounded-lg cursor-pointer transition-all font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDetectionPopup(false);
                  setDetectedCustomer(null);
                }}
                className="px-4 py-2 text-xs bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-505 hover:to-indigo-605 text-white rounded-lg shadow-md cursor-pointer transition-all font-bold"
              >
                Continue
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Business Owner Unlock Reason Prompt */}
      {unlockingRecordId && (
        <div id="modal_sales_record_unlock" className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl w-full max-w-md shadow-2xl relative p-6 space-y-4">
            <div className="absolute top-0 left-12 w-48 h-48 bg-amber-500/[0.03] rounded-full blur-[60px] pointer-events-none" />
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 relative z-10 font-sans">
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest font-mono flex items-center gap-1.5">
                  <span className="p-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] rounded font-black font-mono">OWNER OVERRIDE</span>
                  <span>UNLOCK REASON REQUIRED</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Provide a justification to unlock this protected sales record.
                </p>
              </div>
              <button 
                onClick={() => { setUnlockingRecordId(''); setUnlockReason('Data Correction'); setUnlockCustomReason(''); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const finalReason = unlockReason === 'Other' ? unlockCustomReason : unlockReason;
              if (!finalReason.trim()) {
                alert('A valid unlock reason is required.');
                return;
              }
              unlockRecord(unlockingRecordId, 'Sales', finalReason);
              setUnlockingRecordId('');
              setUnlockCustomReason('');
              setUnlockReason('Data Correction');
              alert('Record unlocked successfully for editing!');
            }} className="space-y-4 relative z-10 font-sans">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
                  Select Override Reason *
                </label>
                <select
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-205 focus:outline-none focus:border-slate-700"
                >
                  <option value="Data Correction">Data Correction</option>
                  <option value="Customer Request">Customer Request</option>
                  <option value="Admin Override">Admin Override</option>
                  <option value="Other">Other (Type custom reason)</option>
                </select>
              </div>

              {unlockReason === 'Other' && (
                <div className="animate-fade-in">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
                    Custom justification *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter unlock justification..."
                    value={unlockCustomReason}
                    onChange={(e) => setUnlockCustomReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-700"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800 font-bold">
                <button
                  type="button"
                  onClick={() => { setUnlockingRecordId(''); setUnlockReason('Data Correction'); setUnlockCustomReason(''); }}
                  className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg cursor-pointer border border-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-sm cursor-pointer font-extrabold uppercase tracking-wide font-mono border border-amber-500/20"
                >
                  🔓 Confirm Unlock
                </button>
              </div>
            </form>
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
                      <span className="text-indigo-400 font-bold text-xs">{normalizeCategory(viewingPkgDetails.category)}</span>
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
                          const parsed = parseTeamMembers(pkg.team_members);
                          setPkgTeamMembers(parsed.length > 0 ? parsed : ['']);
                          const parsedDel = pkg.deliverables ? pkg.deliverables.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean) : [];
                          setPkgDeliverablesList(parsedDel);
                          setPkgDeliverableInput('');
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


      {/* Delete Package Confirmation / Safety Check Modal */}

      {deletingPackageId && (() => {
        const pkg = packages.find(p => p.package_id === deletingPackageId);
        if (!pkg) return null;

        const isUsed = (() => {
          const pkgId = deletingPackageId;
          const nameLower = (pkg.package_name || '').trim().toLowerCase();

          // 1. Check Leads
          const usedInLeads = (leads || []).some(lead => {
            const option = (lead.Select_Package_Option || '').trim().toLowerCase();
            return option === pkgId.toLowerCase() || option === nameLower;
          });

          // Also check LeadPackages
          const usedInLeadPackages = (leadPackages || []).some(lp => {
            return lp.package_id === pkgId || (lp.package_name || '').trim().toLowerCase() === nameLower;
          });

          // 2. Check Quotations
          const usedInQuotations = (quotations || []).some(quote => {
            return (
              quote.package_id === pkgId ||
              quote.selected_package_id === pkgId ||
              quote.Select_Package_Option === pkgId ||
              (quote.package_name || '').trim().toLowerCase() === nameLower
            );
          });

          // 3. Check Orders
          const usedInOrders = (orders || []).some(order => {
            return (order.package_name || '').trim().toLowerCase() === nameLower;
          });

          return usedInLeads || usedInLeadPackages || usedInQuotations || usedInOrders;
        })();

        return createPortal(
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[20001] flex items-center justify-center p-4 overflow-y-auto animate-fade-in text-left text-xs bg-black/60">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative text-slate-355">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <span className="text-xl">🗑️</span>
                <h3 className="text-base font-bold text-white">Delete Package</h3>
              </div>

              {isUsed ? (
                <div className="space-y-4">
                  <p className="text-slate-300 text-xs leading-relaxed font-sans">
                    This package is already being used in existing records and cannot be deleted. You may deactivate it instead.
                  </p>
                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setDeletingPackageId(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-755 text-slate-200 font-bold rounded-lg cursor-pointer transition-all text-xs border border-transparent"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-300 text-xs leading-relaxed font-sans">
                    Are you sure you want to permanently delete this package?
                    <br /><br />
                    This action cannot be undone.
                  </p>
                  
                  {isSaving && (
                    <div className="text-indigo-400 font-mono text-[10px] animate-pulse">
                      Processing package deletion...
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/60">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setDeletingPackageId(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold rounded-lg cursor-pointer transition-all text-xs border border-slate-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={async () => {
                        try {
                          setIsSaving(true);
                          await deletePackage(pkg.package_id);
                          setDeletingPackageId(null);
                        } catch (err: any) {
                          alert(err.message || err);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer transition-all text-xs shadow-md disabled:opacity-50"
                    >
                      {isSaving ? 'Deleting...' : 'Delete Package'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        );
      })()}

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
                              {normalizeCategory(pkg.category)}
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
                          {pkg ? normalizeCategory(pkg.category) : 'General'}
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
