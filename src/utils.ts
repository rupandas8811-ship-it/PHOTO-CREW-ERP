import { Lead, Order, Payment, Customer } from './types';
import { supabaseClient } from './supabaseClient';

/**
 * Resolves a raw image value (which could be a full URL, base64 data URI, or a Supabase Storage relative path)
 * into a usable HTTP/HTTPS public image URL.
 */
export function resolveStorageUrl(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // If it's a relative path like "proofs/xyz.jpg" or "img/proofs/xyz.jpg" or "xyz.png"
  if (/\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(trimmed) || trimmed.includes('/')) {
    const cleanPath = trimmed.replace(/^img\//, '').replace(/^\//, '');
    const supabaseUrl = 'https://aqifyxsimhqayfjwzzwj.supabase.co';
    return `${supabaseUrl}/storage/v1/object/public/img/${cleanPath}`;
  }

  return null;
}

/**
 * Uploads an image (base64 string, File, or Blob) to Supabase Storage bucket 'img'
 * and returns the public URL. If proofInput is already an HTTP/HTTPS URL, returns it directly.
 */
export async function uploadProofToStorage(proofInput: string | File | Blob, filenamePrefix: string = 'proof'): Promise<string> {
  if (!proofInput) {
    throw new Error("No proof image or link provided.");
  }

  // 1. If it's an HTTP or HTTPS URL already, return as is
  if (typeof proofInput === 'string') {
    const trimmed = proofInput.trim();
    if (!trimmed) throw new Error("Proof string is empty.");
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
  }

  let blob: Blob;
  let contentType = 'image/jpeg';
  let base64DataUri: string | null = null;

  if (proofInput instanceof File || proofInput instanceof Blob) {
    blob = proofInput;
    contentType = proofInput.type || 'image/jpeg';
    try {
      base64DataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(proofInput);
      });
    } catch (e) {
      console.warn("[uploadProofToStorage] Could not generate base64 for fallback:", e);
    }
  } else if (typeof proofInput === 'string' && proofInput.trim().startsWith('data:')) {
    base64DataUri = proofInput.trim();
    const parts = base64DataUri.split(';base64,');
    contentType = parts[0].replace('data:', '') || 'image/jpeg';
    const byteCharacters = atob(parts[1]);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    blob = new Blob(byteArrays, { type: contentType });
  } else if (typeof proofInput === 'string') {
    const resolved = resolveStorageUrl(proofInput);
    if (resolved) return resolved;
    throw new Error("Invalid proof format provided.");
  } else {
    throw new Error("Invalid proof input format.");
  }

  const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const fileName = `proofs/${cleanPrefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;

  // 1. Try Direct Supabase Client Upload first
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.storage
        .from('img')
        .upload(fileName, blob, {
          contentType,
          upsert: true
        });

      if (!error) {
        const { data: publicData } = supabaseClient.storage
          .from('img')
          .getPublicUrl(fileName);

        if (publicData && publicData.publicUrl) {
          console.log("[uploadProofToStorage] Uploaded directly to Supabase storage:", publicData.publicUrl);
          return publicData.publicUrl;
        }
      } else {
        console.warn("[uploadProofToStorage] Direct storage upload warning:", error.message || error);
      }
    } catch (directErr) {
      console.warn("[uploadProofToStorage] Direct storage upload exception:", directErr);
    }
  }

  // 2. Fallback to Server Proxy /api/upload-proof (Admin client with Service Role key)
  if (base64DataUri) {
    try {
      const resp = await fetch('/api/upload-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: base64DataUri,
          fileName,
          contentType
        })
      });
      const resData = await resp.json();
      if (resData.success && resData.publicUrl) {
        console.log("[uploadProofToStorage] Uploaded successfully via server admin proxy:", resData.publicUrl);
        return resData.publicUrl;
      } else {
        throw new Error(resData.error || 'Server storage upload failed');
      }
    } catch (proxyErr: any) {
      console.error("[uploadProofToStorage] Server proxy upload exception:", proxyErr);
      throw new Error(`Supabase Storage Upload Error: ${proxyErr.message || String(proxyErr)}`);
    }
  }

  throw new Error("Supabase Storage Upload Error: Failed to upload proof image to Supabase Storage.");
}

/**
 * Converts any AM/PM or HH:mm time string to a 24-hour HH:mm:ss format for SQL.
 */
export function convertTimeToDbFormat(timeStr: string): string {
  if (!timeStr) return '';
  
  // Try to match 10pm, 10:00pm, 10 am, 10:00 AM, or just 10, 10:00
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2] || '00';
    const period = match[3]?.toLowerCase();
    
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    
    return `${String(hours).padStart(2, '0')}:${minutes}:00`;
  }
  
  console.warn("Invalid time format passed to convertTimeToDbFormat:", timeStr);
  return '00:00:00'; // Return a default valid time instead of the original string
}

/**
 * Utility functions for formatting Indian currency, phone numbers, and AM/PM times.
 */

/**
 * Formats a number to Indian Rupee (₹) format (Lakhs/Crores formatting).
 * Example: 150000 -> ₹1,50,000
 */
export function formatINR(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0';
  }
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

/**
 * Validates if the phone number is a valid Indian mobile number.
 * Valid Indian mobile numbers are 10 digits starting with 6, 7, 8, or 9.
 * They can optionally have an prefix of +91, 91, or 0.
 */
export function validateIndianMobile(phone: string): boolean {
  if (!phone) return false;
  // Strip all non-digit characters except an optional leading +
  const cleaned = phone.replace(/[^\d]/g, '');
  
  if (cleaned.length === 10) {
    return /^[6-9]\d{9}$/.test(cleaned);
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(cleaned.slice(2));
  }

  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return /^[6-9]\d{9}$/.test(cleaned.slice(1));
  }

  return false;
}

/**
 * Formats a phone number input to Indian format: +91 XXXXX XXXXX
 */
export function formatIndianPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Strip all non-digit characters
  const cleaned = phone.replace(/[^\d]/g, '');
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const mainPart = cleaned.slice(2);
    return `+91 ${mainPart.slice(0, 5)} ${mainPart.slice(5)}`;
  }
  
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const mainPart = cleaned.slice(1);
    return `+91 ${mainPart.slice(0, 5)} ${mainPart.slice(5)}`;
  }

  // If already prefixed with +91 or similarly handled
  if (phone.trim().startsWith('+91')) {
    const digitsOnly = phone.replace('+91', '').replace(/[^\d]/g, '');
    if (digitsOnly.length === 10) {
      return `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
    }
  }

  // Return formatted with +91 default fallback if it's 10 digits but wasn't caught
  const last10 = cleaned.slice(-10);
  if (last10.length === 10 && /^[6-9]/.test(last10)) {
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }

  return phone;
}

/**
 * Converts any 24-hour HH:mm time string to a 12-hour AM/PM format.
 * Automatically handles full datetime strings or already formatted strings.
 * Example: "14:30" -> "02:30 PM"
 */
export function formatTime12Hour(timeStr?: string): string {
  if (!timeStr) return '';
  
  // If it already has AM/PM, just return it
  if (/am|pm/i.test(timeStr)) {
    return timeStr.trim();
  }

  // Check if it is a full datetime ISO string (e.g. 2026-06-11T14:30:00Z)
  if (timeStr.includes('T')) {
    try {
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // convert 0 to 12
        const strHours = hours < 10 ? `0${hours}` : `${hours}`;
        const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
        return `${strHours}:${strMinutes} ${ampm}`;
      }
    } catch (e) {
      // Fall through to standard parsing
    }
  }

  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].slice(0, 2);
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // convert 0 to 12
      const strHours = hours < 10 ? `0${hours}` : `${hours}`;
      return `${strHours}:${minutes} ${ampm}`;
    }
  }

  return timeStr;
}

export function cleanPhone(phone: string | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d]/g, '');
  return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
}

export function cleanEmail(email: string | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Compile unified Customer Profiles dynamically from Leads, Orders, and Payments.
 * Ensures consistent Customer ID mapping using deterministic sorting and links history.
 */
export function getCustomers(leads: Lead[], orders: Order[], payments: Payment[]): Customer[] {
  const customerMap: { [key: string]: {
    name: string;
    mobile: string;
    altMobile?: string;
    email: string;
    leads: Lead[];
    orders: Order[];
  } } = {};

  const getMatchedGroupKey = (mobile: string, altMobile?: string, email?: string): string | null => {
    const cp = cleanPhone(mobile);
    const calt = cleanPhone(altMobile);
    const ce = cleanEmail(email);

    if (!cp && !calt && !ce) return null;

    for (const k of Object.keys(customerMap)) {
      const parent = customerMap[k];
      const pcp = cleanPhone(parent.mobile);
      const pcalt = cleanPhone(parent.altMobile);
      const pce = cleanEmail(parent.email);

      if (
        (cp && (cp === pcp || cp === pcalt)) ||
        (calt && (calt === pcp || calt === pcalt)) ||
        (ce && ce === pce)
      ) {
        return k;
      }
    }
    return null;
  };

  // Group leads
  leads.forEach(lead => {
    const matchedKey = getMatchedGroupKey(lead.mobile, lead.alternate_mobile, lead.email);
    const key = matchedKey || lead.email.trim().toLowerCase() || lead.mobile.replace(/[^\d]/g, '') || lead.lead_id;

    if (!customerMap[key]) {
      customerMap[key] = {
        name: lead.customer_name,
        mobile: lead.mobile,
        altMobile: lead.alternate_mobile,
        email: lead.email,
        leads: [],
        orders: []
      };
    }
    
    // Append lead
    if (!customerMap[key].leads.some(l => l.lead_id === lead.lead_id)) {
      customerMap[key].leads.push(lead);
    }
    // Set alt info if missing
    if (!customerMap[key].altMobile && lead.alternate_mobile) {
      customerMap[key].altMobile = lead.alternate_mobile;
    }
    if (!customerMap[key].email && lead.email) {
      customerMap[key].email = lead.email;
    }
    if (!customerMap[key].name && lead.customer_name) {
      customerMap[key].name = lead.customer_name;
    }
  });

  // Group orders and map to their leads/customers
  orders.forEach(order => {
    // Find associated lead to fetch alt mobile & email for accurate grouping
    const associatedLead = leads.find(l => l.lead_id === order.lead_id);
    const matchedKey = getMatchedGroupKey(
      order.mobile,
      associatedLead?.alternate_mobile,
      associatedLead?.email
    );
    
    const key = matchedKey || associatedLead?.email?.trim()?.toLowerCase() || order.mobile.replace(/[^\d]/g, '') || order.order_id;

    if (!customerMap[key]) {
      customerMap[key] = {
        name: order.customer_name,
        mobile: order.mobile,
        altMobile: associatedLead?.alternate_mobile,
        email: associatedLead?.email || '',
        leads: associatedLead ? [associatedLead] : [],
        orders: []
      };
    }

    if (!customerMap[key].orders.some(o => o.order_id === order.order_id)) {
      customerMap[key].orders.push(order);
    }
    if (!customerMap[key].name && order.customer_name) {
      customerMap[key].name = order.customer_name;
    }
  });

  // Convert map to array and filter out empty nodes
  const customerList = Object.keys(customerMap)
    .map(k => customerMap[k])
    .filter(c => c.name || c.mobile || c.email);

  // Sort deterministically to keep Customer IDs stable
  customerList.sort((a, b) => {
    const valA = cleanEmail(a.email) || cleanPhone(a.mobile) || a.name;
    const valB = cleanEmail(b.email) || cleanPhone(b.mobile) || b.name;
    return valA.localeCompare(valB);
  });

  // Map to Customer objects with index-based IDs (CUST-001, CUST-002, ...)
  return customerList.map((c, index) => {
    const customer_id = `CUST-${String(index + 1).padStart(3, '0')}`;

    // Link customer_id back into all the matched leads and orders
    c.leads.forEach(l => { l.customer_id = customer_id; });
    c.orders.forEach(o => { o.customer_id = customer_id; });

    // Link payments
    const customerOrdersIds = c.orders.map(o => o.order_id);
    const customerPayments = payments.filter(p => customerOrdersIds.includes(p.order_id));

    // Calculate total collected revenue: based on advance + final payments
    const collectedRevenue = customerPayments.reduce((sum, p) => sum + (Number(p.advance_received || 0) + Number(p.final_payment_received || 0)), 0);
    // fallback if no payments are configured
    const totalRevenue = collectedRevenue || c.orders.reduce((sum, o) => sum + Number(o.advance_received || 0), 0);

    // Collect packages and events
    const previousPackages = Array.from(new Set(c.orders.map(o => o.package_name).filter(Boolean)));
    const previousEvents = Array.from(new Set(c.orders.map(o => o.event_type).filter(Boolean)));

    // Find the latest event date
    const allEventDates = [
      ...c.leads.map(l => l.event_date),
      ...c.orders.map(o => o.event_date)
    ].filter(Boolean);
    
    const lastEventDate = allEventDates.length > 0 
      ? [...allEventDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : undefined;

    return {
      customer_id,
      customer_name: c.name,
      mobile: c.mobile,
      alternate_mobile: c.altMobile,
      email: c.email,
      totalOrders: c.orders.length,
      totalRevenue,
      previousPackages,
      previousEvents,
      lastEventDate,
      leads: c.leads,
      orders: c.orders,
      payments: customerPayments
    };
  });
}

/**
 * Automatically scrolls to a popup or container and focuses the first input/interactive field inside it.
 */
export function triggerAutoScrollAndFocus(selector: string, delayMs: number = 100) {
  setTimeout(() => {
    const container = document.querySelector(selector) as HTMLElement;
    if (container) {
      // Bring popup into view
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Focus first field
      const firstInput = container.querySelector(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]'
      ) as HTMLElement;
      if (firstInput) {
        firstInput.focus({ preventScroll: true });
      }
    }
  }, delayMs);
}

/**
 * Normalizes package category strings to prevent duplicates in dropdown menus and lists.
 * It maps variants like 'Weddings', 'Wedding Package', or 'Wedding Packages' to a clean 'Wedding' category.
 */
export function normalizeCategory(cat: string): string {
  if (!cat) return '';
  const trimmed = cat.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === 'weddings' ||
    lower === 'wedding package' ||
    lower === 'wedding packages' ||
    lower === 'wedding'
  ) {
    return 'Wedding';
  }
  return trimmed;
}

import { LeadEvent } from './types';

/**
 * Serializes LeadEvent array to append to text notes
 */
export function serializeLeadEvents(events: LeadEvent[], textNotes: string = ''): string {
  const marker = '\n\n---EVENTS_JSON---';
  let cleanNotes = textNotes || '';
  if (cleanNotes.includes('---EVENTS_JSON---')) {
    cleanNotes = cleanNotes.split('---EVENTS_JSON---')[0].trim();
  }
  return cleanNotes + marker + JSON.stringify(events);
}

/**
 * Deserializes LeadEvent array from text notes
 */
export function deserializeLeadEvents(textNotes: string | undefined): { events: LeadEvent[], notes: string } {
  if (!textNotes) return { events: [], notes: '' };

  let notes = textNotes;
  let jsonString = '';

  const markerRegex = /---EVENTS_JSON---/i;
  const match = markerRegex.exec(textNotes);

  if (match) {
    const splitIdx = match.index;
    notes = textNotes.substring(0, splitIdx).trim();
    jsonString = textNotes.substring(splitIdx + match[0].length).trim();
  } else {
    // Check if textNotes contains a JSON array or object
    const firstBracket = textNotes.indexOf('[');
    const lastBracket = textNotes.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      notes = textNotes.substring(0, firstBracket).trim();
      jsonString = textNotes.substring(firstBracket, lastBracket + 1).trim();
    }
  }

  if (jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        return { events: parsed, notes };
      } else if (parsed && typeof parsed === 'object') {
        return { events: [parsed], notes };
      }
    } catch (e) {
      console.warn("Failed to parse serialized lead events:", e);
    }
  }

  return { events: [], notes: textNotes };
}

/**
 * Parses team members field from JSON string array or falls back to older text formats
 */
export function parseTeamMembers(teamMembersStr: string | undefined | null, targetEventName?: string): string[] {
  if (!teamMembersStr) return [];
  const trimmed = teamMembersStr.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return [];
  
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const result: string[] = [];
        if (parsed[0] && typeof parsed[0] === 'object' && ('team_members' in parsed[0] || 'event_name' in parsed[0] || 'event_id' in parsed[0])) {
          let eventsToUse = parsed;
          if (targetEventName) {
            const matched = parsed.filter((ev: any) => {
              const evName = (ev.event_name || ev.event_type || '').toLowerCase();
              return evName === targetEventName.toLowerCase() || evName.includes(targetEventName.toLowerCase()) || targetEventName.toLowerCase().includes(evName);
            });
            if (matched.length > 0) eventsToUse = matched;
          }
          eventsToUse.forEach((ev: any) => {
            const members = Array.isArray(ev.team_members) ? ev.team_members : (Array.isArray(ev.members) ? ev.members : []);
            members.forEach((m: any) => {
              if (typeof m === 'object' && m !== null) {
                const qty = Number(m.qty || m.quantity || 1);
                const name = m.name || m.role || m.member_name || '';
                if (name) result.push(qty > 1 ? `${qty} ${name}`.trim() : name);
              } else if (m) {
                result.push(String(m).trim());
              }
            });
          });
          return result;
        } else {
          return parsed.map(item => {
            if (typeof item === 'object' && item !== null) {
              const qty = Number(item.qty || item.quantity || 1);
              const name = item.name || item.role || item.member_name || '';
              return qty > 1 ? `${qty} ${name}`.trim() : name;
            }
            return String(item).trim();
          }).filter(Boolean);
        }
      }
    } catch (e) {
      // Fallback
    }
  }
  // Fallback for older formats (split by newline or comma)
  if (trimmed.includes('\n')) {
    return trimmed.split('\n').map(item => item.trim()).filter(Boolean);
  }
  return trimmed.split(',').map(item => item.trim()).filter(Boolean);
}

export function parseQtyAndText(raw: any): { qty: number; text: string } {
  if (raw === null || raw === undefined) return { qty: 1, text: "" };

  let qty = 1;
  let text = "";

  if (typeof raw === "object") {
    const q = Number(raw.qty || raw.quantity || raw.count || 1);
    qty = isNaN(q) || q < 1 ? 1 : q;
    text = String(raw.name || raw.text || raw.deliverable || raw.title || raw.role || raw.member_name || "").trim();
  } else {
    text = String(raw).trim();
  }

  if (!text) return { qty: 1, text: "" };

  let foundQtyFromPattern: number | null = null;
  // 1. Extract any (Qty X), (quantity X), (Qty: X) occurrences anywhere in text
  const qtyPatterns = /\s*[\(\[-]?\s*(?:qty|quantity|count)\s*[:=]?\s*(\d+)\s*[\)\]\-]?/gi;
  let match;
  while ((match = qtyPatterns.exec(text)) !== null) {
    if (match[1]) {
      const parsedQty = parseInt(match[1], 10);
      if (!isNaN(parsedQty) && parsedQty >= 1) {
        if (foundQtyFromPattern === null) {
          foundQtyFromPattern = parsedQty;
        }
      }
    }
  }

  // Remove ALL (Qty X) / (quantity X) / (Qty: X) patterns completely from text
  text = text.replace(/\s*[\(\[-]?\s*(?:qty|quantity|count)\s*[:=]?\s*\d+\s*[\)\]\-]?/gi, "").trim();

  // 2. Check for leading quantity: e.g. "2 Lead Photographer", "2 x Traditional Photos", "2 × Traditional Photos"
  const leadingMatch = text.match(/^(\d+)\s*[\*xX×\-–—]?\s*(.*)$/);
  if (leadingMatch) {
    const parsedQty = parseInt(leadingMatch[1], 10);
    if (!isNaN(parsedQty) && parsedQty >= 1) {
      if (typeof raw !== "object" && foundQtyFromPattern === null) {
        qty = parsedQty;
      }
    }
    text = leadingMatch[2] ? leadingMatch[2].trim() : "";
    text = text.replace(/^[xX×\*\-–—]\s*/, "").trim();
  }

  if (typeof raw !== "object" && foundQtyFromPattern !== null) {
    qty = foundQtyFromPattern;
  }

  // Clean any leftover (Qty X) or trailing/leading punctuation
  text = text.replace(/\s*[\(\[-]?\s*(?:qty|quantity|count)\s*[:=]?\s*\d+\s*[\)\]\-]?/gi, "").trim();
  text = text.replace(/^[\*\-•xX×]\s*/, "").trim();
  text = text.replace(/[\(\[\-–—:]+$/, "").trim();

  return { qty: isNaN(qty) || qty < 1 ? 1 : qty, text };
}

export function parseDeliverablesWithQty(
  description: string | undefined | null,
  targetEventName?: string,
  targetEventId?: string
): { name: string; qty: number }[] {
  if (!description) return [];

  let itemsRaw: any[] = [];
  let isFilteredButNoMatch = false;
  let isJson = false;

  const trimmed = description.trim();
  // 1. Try parsing JSON
  if (typeof description === 'string' && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
    try {
      const parsed = JSON.parse(trimmed);
      isJson = true;

      if (Array.isArray(parsed)) {
        // Case A: Array of event objects: [{ event_name: "...", deliverables: [...] }]
        if (parsed[0] && typeof parsed[0] === 'object' && ('event_name' in parsed[0] || 'event_type' in parsed[0] || 'deliverables' in parsed[0] || 'event_id' in parsed[0])) {
          let targetEvents = parsed;
          if (targetEventId || targetEventName) {
            const matched = parsed.filter((ev: any) => {
              const evIdMatch = targetEventId && ev.event_id && String(ev.event_id) === String(targetEventId);
              const evName = (ev.event_name || ev.event_type || ev.name || '').toLowerCase();
              const nameMatch = targetEventName && (evName === targetEventName.toLowerCase() || evName.includes(targetEventName.toLowerCase()) || targetEventName.toLowerCase().includes(evName));
              return evIdMatch || nameMatch;
            });
            if (matched.length > 0) {
              targetEvents = matched;
            } else {
              targetEvents = [];
              isFilteredButNoMatch = true;
            }
          }
          targetEvents.forEach((ev: any) => {
            if (Array.isArray(ev.deliverables)) {
              itemsRaw.push(...ev.deliverables);
            } else if (Array.isArray(ev.deliverables_list)) {
              itemsRaw.push(...ev.deliverables_list);
            } else if (typeof ev.deliverables === 'string') {
              itemsRaw.push(ev.deliverables);
            }
          });
        } 
        // Case B: Array of items directly: [{ qty: 2, name: "..." }] or ["2 x Photo"]
        else {
          itemsRaw = parsed;
        }
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.deliverables)) {
          itemsRaw = parsed.deliverables;
        } else if (Array.isArray(parsed.deliverables_list)) {
          itemsRaw = parsed.deliverables_list;
        }
      }
    } catch (e) {
      isJson = false;
    }
  }

  // 2. If no JSON items extracted, treat description as plain text ONLY if description was NOT valid JSON
  if (itemsRaw.length === 0 && typeof description === 'string' && !isJson && !isFilteredButNoMatch) {
    itemsRaw = description.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  }

  // 3. Process raw items into { name, qty }
  const result: { name: string; qty: number }[] = [];
  const map = new Map<string, number>();

  itemsRaw.forEach(item => {
    if (!item) return;
    let qty = 1;
    let text = '';

    if (typeof item === 'object' && item !== null) {
      qty = Number(item.qty || item.quantity || item.count || 1);
      if (isNaN(qty) || qty < 1) qty = 1;
      text = String(item.name || item.text || item.deliverable || item.title || '').trim();
    } else {
      const parsedItem = parseQtyAndText(String(item));
      qty = parsedItem.qty;
      text = parsedItem.text;
    }

    if (text) {
      text = text.replace(/^[\*\-•xX×]\s*/, '').trim();
      const existingQty = map.get(text) || 0;
      map.set(text, existingQty + qty);
    }
  });

  map.forEach((qty, name) => {
    result.push({ name, qty });
  });

  return result;
}

export function formatQtyItem(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const { qty, text } = parseQtyAndText(trimmed);
  if (!text) return trimmed;
  return `${qty} × ${text}`;
}

export function formatQtyArray(raw: string | string[] | undefined | null): string[] {
  if (!raw) return [];
  let items: string[] = [];
  if (Array.isArray(raw)) {
    items = raw.map(s => String(s).trim()).filter(Boolean);
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          items = parsed.map(s => String(s).trim()).filter(Boolean);
        }
      } catch (e) {
        items = trimmed.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
      }
    } else if (trimmed.includes('\n')) {
      items = trimmed.split('\n').map(s => s.trim()).filter(Boolean);
    } else {
      items = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return items.map(formatQtyItem);
}

export function formatQtyList(raw: string | string[] | undefined | null, delimiter: string = ', '): string {
  const formatted = formatQtyArray(raw);
  return formatted.join(delimiter);
}



export const convertTo12Hour = (timeStr: string | undefined | null): string => {
  if (!timeStr) return '';
  const [hour, min] = timeStr.split(':');
  if (!hour || !min) return timeStr;
  const h = parseInt(hour, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${min} ${ampm}`;
};
