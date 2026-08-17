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

export interface ParsedCustomerProof {
  hasProof: boolean;
  imageUrl: string | null;
  linkUrl: string | null;
  proofType: 'image' | 'link' | 'both' | 'button' | 'none';
}

/**
 * Intelligently inspects and extracts saved Customer Confirmation Proof / Image across
 * editor_assignments, production, and orders records in Supabase.
 */
export function parseCustomerProof(
  assignment: any,
  prodRec?: any,
  orderRec?: any
): ParsedCustomerProof {
  if (!assignment && !prodRec && !orderRec) {
    return { hasProof: false, imageUrl: null, linkUrl: null, proofType: 'none' };
  }

  // 1. Gather all candidate proof strings from the assignment record
  const assignmentCandidates = assignment ? [
    assignment.confirmation_proof,
    assignment.customer_communication_proof,
    assignment.client_communication_proof,
    assignment.proof_image,
    assignment.image_proof,
    assignment.image_url,
    assignment.uploaded_proof,
    assignment.upload_proof,
    assignment.proof_url,
    assignment.proof
  ] : [];

  let rawImageUrl: string | null = null;
  let rawLinkUrl: string | null = null;

  const isImageValue = (val: string): boolean => {
    const trimmed = val.trim();
    if (
      trimmed.startsWith('data:image/') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.includes('/storage/v1/object/public/img/') ||
      trimmed.includes('/storage/v1/object/public/') ||
      trimmed.includes('googleusercontent.com') ||
      /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)(\?.*)?$/i.test(trimmed) ||
      /^(img\/)?proofs\/.*\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(trimmed)
    ) {
      return true;
    }
    const resolved = resolveStorageUrl(trimmed);
    if (resolved && (resolved.includes('/img/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)/i.test(resolved))) {
      return true;
    }
    return false;
  };

  const isLinkValue = (val: string): boolean => {
    const trimmed = val.trim();
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('www.') ||
      trimmed.includes('drive.google.com') ||
      trimmed.includes('dropbox.com') ||
      trimmed.includes('mega.nz') ||
      trimmed.includes('onedrive.live.com') ||
      trimmed.includes('icloud.com')
    );
  };

  const isValidValue = (val: any): val is string => {
    if (!val || typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed) return false;
    const lower = trimmed.toLowerCase();
    return !['pending', 'null', 'undefined', '-', 'n/a', 'none', 'pending upload', 'not uploaded'].includes(lower);
  };

  for (const cand of assignmentCandidates) {
    if (!isValidValue(cand)) continue;
    const trimmed = cand.trim();

    if (isImageValue(trimmed)) {
      if (!rawImageUrl) {
        rawImageUrl = trimmed;
      }
    } else if (isLinkValue(trimmed)) {
      if (!rawLinkUrl) {
        rawLinkUrl = trimmed;
      }
    }
  }

  // 2. Fallback to prodRec / orderRec if no proof found on assignment and this assignment matches
  if (!rawImageUrl && !rawLinkUrl) {
    const fallbackCandidates = [
      prodRec?.client_communication_proof,
      prodRec?.customer_communication_proof,
      prodRec?.proof_url,
      prodRec?.communication_proof,
      prodRec?.proof_image,
      orderRec?.client_communication_proof,
      orderRec?.customer_communication_proof,
      orderRec?.proof_url
    ];

    for (const cand of fallbackCandidates) {
      if (!isValidValue(cand)) continue;
      const trimmed = cand.trim();

      if (isImageValue(trimmed)) {
        if (!rawImageUrl) rawImageUrl = trimmed;
      } else if (isLinkValue(trimmed)) {
        if (!rawLinkUrl) rawLinkUrl = trimmed;
      }
    }
  }

  // 3. Check if production remarks contains an uploaded proof URL
  if (!rawImageUrl && !rawLinkUrl && prodRec?.remarks && typeof prodRec.remarks === 'string') {
    const match = prodRec.remarks.match(/Proof \((https?:\/\/[^\s)]+)\)/i) || prodRec.remarks.match(/Confirmation Proof:?\s*(https?:\/\/[^\s)]+)/i);
    if (match && match[1]) {
      const pUrl = match[1].trim();
      if (isImageValue(pUrl)) {
        rawImageUrl = pUrl;
      } else if (isLinkValue(pUrl)) {
        rawLinkUrl = pUrl;
      }
    }
  }

  // Format and resolve Image URL
  let resolvedImageUrl: string | null = null;
  if (rawImageUrl) {
    resolvedImageUrl = resolveStorageUrl(rawImageUrl) || rawImageUrl;
    if (resolvedImageUrl.includes('drive.google.com/file/d/')) {
      const fileIdMatch = resolvedImageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        resolvedImageUrl = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
      }
    } else if (resolvedImageUrl.includes('drive.google.com/open?id=')) {
      const fileIdMatch = resolvedImageUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        resolvedImageUrl = `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
      }
    }
  }

  // Format and resolve Link URL
  let resolvedLinkUrl: string | null = null;
  if (rawLinkUrl) {
    resolvedLinkUrl = rawLinkUrl.startsWith('http') ? rawLinkUrl : `https://${rawLinkUrl}`;
  }

  // Determine proofType according to user specification
  if (resolvedImageUrl && resolvedLinkUrl && resolvedImageUrl !== resolvedLinkUrl) {
    return {
      hasProof: true,
      imageUrl: resolvedImageUrl,
      linkUrl: resolvedLinkUrl,
      proofType: 'both'
    };
  }

  if (resolvedImageUrl) {
    return {
      hasProof: true,
      imageUrl: resolvedImageUrl,
      linkUrl: null,
      proofType: 'image'
    };
  }

  if (resolvedLinkUrl) {
    return {
      hasProof: true,
      imageUrl: null,
      linkUrl: resolvedLinkUrl,
      proofType: 'link'
    };
  }

  return {
    hasProof: false,
    imageUrl: null,
    linkUrl: null,
    proofType: 'none'
  };
}

export interface EventTeamMemberConfig {
  event_id?: string;
  event_name?: string;
  package_id?: string;
  team_members: any[];
}

export interface TeamMemberStaffMapping {
  teamMemberRole: string;
  assignedStaffName: string;
  assignedStaffId?: string;
  assignedStaffRole?: string;
  assignedStaffType?: string;
  status: 'Assigned' | 'Pending' | 'In Progress' | 'Completed' | string;
  equipment?: string[];
  mobile?: string;
}

export interface EventTeamMemberAssignmentGroup {
  eventId: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;
  reportingDate: string;
  reportingTime: string;
  location: string;
  googleMapsLink?: string | null;
  guestPax?: string;
  mappings: TeamMemberStaffMapping[];
}

export const extractTeamMembersConfig = (lead: any, leadPkgs: any[]): EventTeamMemberConfig[] => {
  if (!lead && (!leadPkgs || leadPkgs.length === 0)) return [];

  const configs: EventTeamMemberConfig[] = [];

  const parseRaw = (val: any) => {
    if (!val) return null;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        return val.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return val;
  };

  const processParsedData = (parsed: any, pkgId?: string) => {
    if (!parsed) return;

    if (Array.isArray(parsed)) {
      parsed.forEach((item: any) => {
        if (item && typeof item === 'object' && ('event_id' in item || 'event_name' in item || 'event_type' in item || 'team_members' in item || 'inclusions' in item || 'deliverables' in item || 'members' in item)) {
          const evId = String(item.event_id || item.id || '').trim();
          const evName = String(item.event_name || item.name || item.event_type || '').trim();
          const tm = item.team_members || item.inclusions || item.deliverables || item.members || [];
          const tmList = Array.isArray(tm) ? tm : parseRaw(tm) || [];
          if (tmList.length > 0) {
            configs.push({
              event_id: evId,
              event_name: evName,
              package_id: pkgId,
              team_members: tmList
            });
          }
        }
      });

      const isEventArray = parsed.some((item: any) => item && typeof item === 'object' && ('event_id' in item || 'event_name' in item || 'team_members' in item || 'members' in item));
      if (!isEventArray && parsed.length > 0) {
        configs.push({
          event_id: '',
          event_name: '',
          package_id: pkgId,
          team_members: parsed
        });
      }
    } else if (typeof parsed === 'object') {
      Object.entries(parsed).forEach(([key, val]) => {
        if (!val) return;
        const valList = Array.isArray(val) ? val : parseRaw(val) || [val];
        if (Array.isArray(valList) && valList.length > 0) {
          let extractedEvId = key;
          let extractedEvName = key;

          if (pkgId && key.toLowerCase().startsWith(`${pkgId.toLowerCase()}_`)) {
            const rest = key.substring(pkgId.length + 1);
            extractedEvId = rest;
            extractedEvName = rest;
          } else if (key.toLowerCase().startsWith('custom package_')) {
            const rest = key.substring('custom package_'.length);
            extractedEvId = rest;
            extractedEvName = rest;
          } else if (key.toLowerCase().startsWith('custom_package_')) {
            const rest = key.substring('custom_package_'.length);
            extractedEvId = rest;
            extractedEvName = rest;
          } else if (key.includes('_')) {
            const parts = key.split('_');
            const rest = parts.slice(1).join('_');
            extractedEvId = rest;
            extractedEvName = rest;
          }

          configs.push({
            event_id: extractedEvId,
            event_name: extractedEvName,
            package_id: pkgId,
            team_members: valList
          });
        }
      });
    }
  };

  // 1. Inspect direct events on lead (lead.events)
  if (lead?.events && Array.isArray(lead.events) && lead.events.length > 0) {
    lead.events.forEach((ev: any) => {
      const tm = ev.team_members || ev.inclusions || ev.Team_Members || ev.team_members_included || [];
      const parsedTm = Array.isArray(tm) ? tm : parseRaw(tm) || [];
      if (parsedTm.length > 0) {
        configs.push({
          event_id: String(ev.id || ev.event_id || '').trim(),
          event_name: String(ev.event_name || ev.event_type || '').trim(),
          team_members: parsedTm
        });
      }
    });
  }

  // 2. Inspect lead packages (all packages for this lead)
  if (leadPkgs && Array.isArray(leadPkgs)) {
    leadPkgs.forEach((lp: any) => {
      const pkgId = lp.package_id || lp.id;
      const candidates = [
        lp.Team_Members_Included,
        lp.team_members_included,
        lp.editable_inclusions,
        lp.Team_Members,
        lp.team_members
      ];
      candidates.forEach(c => {
        if (c) {
          const parsed = parseRaw(c);
          processParsedData(parsed, pkgId);
        }
      });
    });
  }

  // 3. Inspect lead-level columns
  const leadCandidates = [
    lead?.Team_Members,
    lead?.Team_member,
    (lead as any)?.team_members,
    lead?.Team_Members_Included,
    (lead as any)?.team_members_included
  ];
  leadCandidates.forEach(c => {
    if (c) {
      const parsed = parseRaw(c);
      processParsedData(parsed);
    }
  });

  return configs;
};

export const getEventRolesForEvent = (ev: any, index: number, configList: EventTeamMemberConfig[], totalEvents: number = 1): any[] => {
  if (!ev) return [];

  // 1. Direct event properties
  const directTm = ev.team_members || ev.inclusions || ev.Team_Members || ev.team_members_included;
  if (directTm) {
    if (Array.isArray(directTm) && directTm.length > 0) return directTm;
    if (typeof directTm === 'string') {
      try {
        const parsed = JSON.parse(directTm);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        const list = directTm.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean);
        if (list.length > 0) return list;
      }
    }
  }

  if (!configList || configList.length === 0) return [];

  const evId = String(ev.id || ev.event_id || '').toLowerCase().trim();
  const evName = String(ev.event_name || '').toLowerCase().trim();
  const evType = String(ev.event_type || '').toLowerCase().trim();
  const customName = String(ev.custom_event_name || ev.custom_event_type || '').toLowerCase().trim();

  // 2. Strict ID matching first
  if (evId) {
    const matchById = configList.find(c => {
      if (!c.event_id) return false;
      const cId = c.event_id.toLowerCase().trim();
      return cId === evId || cId.endsWith(`_${evId}`) || cId.endsWith(`-${evId}`);
    });
    if (matchById && matchById.team_members?.length > 0) return matchById.team_members;
  }

  // 3. Name or Type matching
  if (evName || evType || customName) {
    const matchByName = configList.find(c => {
      const cName = (c.event_name || '').toLowerCase().trim();
      if (!cName) return false;
      
      const cleanCName = cName.includes('_') ? cName.split('_').slice(1).join('_').trim() : cName;

      return (
        (evName && (cName === evName || cleanCName === evName)) ||
        (evType && (cName === evType || cleanCName === evType)) ||
        (customName && (cName === customName || cleanCName === customName))
      );
    });
    if (matchByName && matchByName.team_members?.length > 0) return matchByName.team_members;
  }

  // 4. Index matching for multi-event configurations
  if (totalEvents > 1 && configList[index] && configList[index].team_members?.length > 0) {
    return configList[index].team_members;
  }

  // 5. Single-event lead fallback: any config with team members
  if (totalEvents === 1) {
    const anyValidConfig = configList.find(c => c.team_members && c.team_members.length > 0);
    if (anyValidConfig) return anyValidConfig.team_members;
  }

  return [];
};

export function getEventTeamMemberStaffMapping(params: {
  lead?: any;
  order?: any;
  leadPkgs?: any[];
  staffAssignments?: any[];
  operationsRecord?: any;
  staffList?: any[];
  modalEventAllocations?: any;
  finalAssignments?: any[];
  targetStaffName?: string;
}): EventTeamMemberAssignmentGroup[] {
  const {
    lead,
    order,
    leadPkgs = [],
    staffAssignments = [],
    operationsRecord,
    staffList = [],
    modalEventAllocations,
    finalAssignments,
    targetStaffName
  } = params;

  // Resolve Events
  const rawEvents = lead?.events && Array.isArray(lead.events) && lead.events.length > 0
    ? lead.events
    : (lead?.notes_special_customizations ? deserializeLeadEvents(lead.notes_special_customizations).events : []);

  const totalEvents = rawEvents.length > 0 ? rawEvents.length : 1;
  const teamConfigs = extractTeamMembersConfig(lead, leadPkgs);

  const resolvedEvents = rawEvents.length > 0
    ? rawEvents
    : [{
        id: 'default_event',
        event_name: order?.event_name || lead?.event_name || order?.event_type || lead?.event_type || 'Main Event',
        event_type: order?.event_type || lead?.event_type || 'Main Event',
        custom_event_name: order?.custom_event_name || lead?.custom_event_name,
        event_date: order?.event_date || lead?.event_date || 'N/A',
        event_start_time: order?.event_time || lead?.event_time || 'N/A',
        event_end_date: order?.event_end_date || lead?.event_end_date || 'N/A',
        event_end_time: order?.event_end_time || lead?.event_end_time || 'N/A',
        reporting_date: order?.Reporting_date || lead?.Reporting_date || order?.event_date || 'N/A',
        reporting_time: order?.reporting_time || lead?.reporting_time || operationsRecord?.reporting_time || 'N/A',
        event_location: order?.event_location || lead?.event_location || 'N/A',
        google_maps_link: order?.google_maps_link || lead?.google_maps_link || null,
        guest_pax: (lead as any)?.guest_pax || order?.guest_pax || 'N/A'
      }];

  const groups: EventTeamMemberAssignmentGroup[] = [];

  resolvedEvents.forEach((ev: any, evIdx: number) => {
    const evId = String(ev.id || ev.event_id || `ev_${evIdx}`);
    const rawEType = ev.event_type || lead?.event_type || order?.event_type || 'N/A';
    const eventType = rawEType === 'Other' ? (ev.custom_event_type || lead?.custom_event_type || 'Other') : rawEType;
    let eventName = 'Main Event';
    if (ev.event_name === 'Other') {
      eventName = ev.custom_event_name || 'Other';
    } else if (ev.custom_event_name && ev.custom_event_name.trim() !== '') {
      eventName = ev.custom_event_name;
    } else if (ev.event_name && ev.event_name.trim() !== '') {
      eventName = ev.event_name;
    } else if (lead?.custom_event_name && lead.custom_event_name.trim() !== '') {
      eventName = lead.custom_event_name;
    } else if (lead?.event_name && lead.event_name !== 'Other' && lead.event_name.trim() !== '') {
      eventName = lead.event_name;
    } else if (order?.event_name && order.event_name !== 'Other' && order.event_name.trim() !== '') {
      eventName = order.event_name;
    } else if (eventType && eventType !== 'N/A') {
      eventName = eventType;
    }

    const eventDate = ev.event_date || order?.event_date || lead?.event_date || 'N/A';
    const eventStartTime = ev.event_start_time || ev.event_time || order?.event_time || lead?.event_time || 'N/A';
    const eventEndDate = ev.event_end_date || ev.Event_End_Date || order?.event_end_date || lead?.event_end_date || 'N/A';
    const eventEndTime = ev.event_end_time || order?.event_end_time || 'N/A';
    const reportingDate = ev.reporting_date || ev.Reporting_date || order?.Reporting_date || lead?.Reporting_date || eventDate || 'N/A';
    const reportingTime = ev.reporting_time || order?.reporting_time || lead?.reporting_time || operationsRecord?.reporting_time || 'N/A';
    const location = ev.event_location || order?.event_location || lead?.event_location || 'N/A';
    const googleMapsLink = ev.google_maps_link || lead?.google_maps_link || order?.google_maps_link || null;
    const guestPax = ev.guest_pax || (lead as any)?.guest_pax || order?.guest_pax || 'N/A';

    // 1. Extract Sales Team Members Included for this event
    const includedRoles = getEventRolesForEvent(ev, evIdx, teamConfigs, totalEvents);
    const requiredSlots: { roleName: string; originalStr: string }[] = [];
    includedRoles.forEach((roleStr: string) => {
      const { qty, text } = parseQtyAndText(roleStr);
      const roleName = (text || roleStr).trim();
      if (!roleName) return;
      const targetQty = qty || 1;
      for (let k = 0; k < targetQty; k++) {
        requiredSlots.push({ roleName, originalStr: roleStr });
      }
    });

    // 2. Gather Assigned Staff pool for this specific event
    const assignedStaffPool: {
      staff_name: string;
      staff_id?: string;
      staff_role?: string;
      staff_type?: string;
      equipment?: string[];
      mobile?: string;
      status?: string;
      used?: boolean;
    }[] = [];

    // Source A: finalAssignments (from assignment modal save)
    if (finalAssignments && finalAssignments.length > 0) {
      finalAssignments.forEach(a => {
        if ((a.event_id === evId || (!a.event_id && totalEvents === 1) || a.event_name === eventName) && a.staff_name && a.staff_name.trim()) {
          assignedStaffPool.push({
            staff_name: a.staff_name,
            staff_id: a.staff_id,
            staff_role: a.staff_role,
            staff_type: a.staff_type,
            equipment: a.equipment || [],
            mobile: a.mobile || '',
            status: a.task_status || a.assignment_status || 'Assigned'
          });
        }
      });
    }

    // Source B: modalEventAllocations
    if (modalEventAllocations && modalEventAllocations[evId]?.staff) {
      modalEventAllocations[evId].staff.forEach((st: any) => {
        if (st.staff_name && st.staff_name.trim()) {
          const already = assignedStaffPool.some(p => p.staff_name.toLowerCase() === st.staff_name.toLowerCase() && p.staff_role?.toLowerCase() === st.staff_role?.toLowerCase());
          if (!already) {
            assignedStaffPool.push({
              staff_name: st.staff_name,
              staff_id: st.staff_id,
              staff_role: st.staff_role,
              staff_type: st.staff_type,
              equipment: st.equipment || [],
              mobile: st.mobile || '',
              status: st.task_status || st.assignment_status || 'Assigned'
            });
          }
        }
      });
    }

    // Source C: staffAssignments from database
    const orderIdToMatch = order?.order_id || lead?.lead_id;
    if (orderIdToMatch) {
      const orderAssigns = staffAssignments.filter(sa => 
        (sa.order_id === orderIdToMatch || sa.order_id === order?.order_id || sa.order_id === lead?.lead_id) &&
        (sa.event_id === evId || (!sa.event_id && totalEvents === 1) || (sa.event_name && (sa.event_name.toLowerCase() === eventName.toLowerCase() || sa.event_name.toLowerCase() === eventType.toLowerCase()))) &&
        sa.assignment_status !== 'Cancelled'
      );
      orderAssigns.forEach(sa => {
        if (sa.staff_name && sa.staff_name.trim() && sa.staff_name.toLowerCase() !== 'unassigned' && sa.staff_name.toLowerCase() !== 'none') {
          const already = assignedStaffPool.some(p => p.staff_name.toLowerCase() === sa.staff_name.toLowerCase() && (!sa.staff_role || p.staff_role?.toLowerCase() === sa.staff_role?.toLowerCase()));
          if (!already) {
            const stObj = staffList.find(s => s.name?.toLowerCase() === sa.staff_name.toLowerCase() || s.staff_id === sa.staff_id);
            const saEq = sa.equipment ? (Array.isArray(sa.equipment) ? sa.equipment : (() => { try { const p = JSON.parse(sa.equipment); return Array.isArray(p) ? p : [sa.equipment]; } catch(e) { return sa.equipment.split(',').map((s: string) => s.trim()).filter(Boolean); } })()) : [];
            assignedStaffPool.push({
              staff_name: sa.staff_name,
              staff_id: sa.staff_id || stObj?.staff_id,
              staff_role: sa.staff_role || stObj?.role || 'Staff',
              staff_type: sa.staff_type || stObj?.staff_type || 'In-House',
              equipment: saEq,
              mobile: sa.mobile || stObj?.mobile || '',
              status: sa.task_status || sa.assignment_status || 'Assigned'
            });
          }
        }
      });
    }

    // Source D: ev.assigned_staff_names on event record
    if (ev.assigned_staff_names && ev.assigned_staff_names.trim()) {
      const names = ev.assigned_staff_names.split(',').map((n: string) => n.trim()).filter(Boolean);
      let staffEquipments: string[][] = [];
      const mobilesRaw = ev.assigned_staff_mobiles || '';
      if (mobilesRaw.includes(' || EQUIPMENT: JSON:')) {
        try {
          const parts = mobilesRaw.split(' || EQUIPMENT: JSON:');
          staffEquipments = JSON.parse(parts[1]);
        } catch(e) {}
      }
      const cleanMobiles = mobilesRaw.split(' || EQUIPMENT:')[0] || '';
      const mobilesList = cleanMobiles.split(',').map((m: string) => m.trim()).filter(Boolean);

      names.forEach((name, nIdx) => {
        const already = assignedStaffPool.some(p => p.staff_name.toLowerCase() === name.toLowerCase());
        if (!already && name.toLowerCase() !== 'unassigned' && name.toLowerCase() !== 'none') {
          const stObj = staffList.find(s => s.name?.toLowerCase() === name.toLowerCase());
          assignedStaffPool.push({
            staff_name: name,
            staff_id: stObj?.staff_id,
            staff_role: stObj?.role || 'Staff',
            staff_type: stObj?.staff_type || 'In-House',
            equipment: staffEquipments[nIdx] || [],
            mobile: mobilesList[nIdx] || stObj?.mobile || '',
            status: 'Assigned'
          });
        }
      });
    }

    // Source E: operations table fallback for single event
    if (totalEvents === 1 && operationsRecord && assignedStaffPool.length === 0) {
      if (operationsRecord.photographer_assigned) {
        assignedStaffPool.push({
          staff_name: operationsRecord.photographer_assigned,
          staff_role: 'Lead Photographer',
          status: operationsRecord.event_status || 'Assigned'
        });
      }
      if (operationsRecord.videographer_assigned) {
        assignedStaffPool.push({
          staff_name: operationsRecord.videographer_assigned,
          staff_role: 'Lead Videographer',
          status: operationsRecord.event_status || 'Assigned'
        });
      }
      if (operationsRecord.drone_operator_assigned) {
        assignedStaffPool.push({
          staff_name: operationsRecord.drone_operator_assigned,
          staff_role: 'Drone Operator',
          status: operationsRecord.event_status || 'Assigned'
        });
      }
      if (operationsRecord.assistant_assigned) {
        assignedStaffPool.push({
          staff_name: operationsRecord.assistant_assigned,
          staff_role: 'Production Assistant',
          status: operationsRecord.event_status || 'Assigned'
        });
      }
    }

    // 3. Map Sales Team Members Included slots -> Assigned Staff
    const mappings: TeamMemberStaffMapping[] = [];

    const isRoleMatch = (roleA: string, roleB: string) => {
      const a = roleA.toLowerCase().trim();
      const b = roleB.toLowerCase().trim();
      if (a === b) return true;
      if ((a.includes('drone') || a.includes('aerial')) && (b.includes('drone') || b.includes('aerial'))) return true;
      if ((a.includes('photo') || a.includes('photographer')) && (b.includes('photo') || b.includes('photographer'))) return true;
      if ((a.includes('video') || a.includes('cinema')) && (b.includes('video') || b.includes('cinema'))) return true;
      if ((a.includes('assist') || a.includes('helper')) && (b.includes('assist') || b.includes('helper'))) return true;
      if (a.includes('editor') && b.includes('editor')) return true;
      return false;
    };

    requiredSlots.forEach(slot => {
      // Find matching unassigned staff in pool
      let matchedStaffIdx = assignedStaffPool.findIndex(p => !p.used && p.staff_role && isRoleMatch(p.staff_role, slot.roleName));
      if (matchedStaffIdx === -1) {
        // Fallback: check staff directory role
        matchedStaffIdx = assignedStaffPool.findIndex(p => {
          if (p.used) return false;
          const stObj = staffList.find(s => s.name?.toLowerCase() === p.staff_name.toLowerCase());
          return stObj?.role && isRoleMatch(stObj.role, slot.roleName);
        });
      }
      if (matchedStaffIdx === -1) {
        // Fallback: any unused staff in this event pool
        matchedStaffIdx = assignedStaffPool.findIndex(p => !p.used);
      }

      if (matchedStaffIdx !== -1) {
        const staffMember = assignedStaffPool[matchedStaffIdx];
        staffMember.used = true;
        mappings.push({
          teamMemberRole: slot.roleName,
          assignedStaffName: staffMember.staff_name,
          assignedStaffId: staffMember.staff_id,
          assignedStaffRole: staffMember.staff_role || slot.roleName,
          assignedStaffType: staffMember.staff_type || 'In-House',
          status: staffMember.status || 'Assigned',
          equipment: staffMember.equipment || [],
          mobile: staffMember.mobile || ''
        });
      } else {
        mappings.push({
          teamMemberRole: slot.roleName,
          assignedStaffName: 'Unassigned',
          status: 'Pending',
          equipment: []
        });
      }
    });

    // 4. Any leftover assigned staff in pool not mapped to a required slot
    assignedStaffPool.forEach(staffMember => {
      if (!staffMember.used) {
        mappings.push({
          teamMemberRole: staffMember.staff_role || 'Crew Member',
          assignedStaffName: staffMember.staff_name,
          assignedStaffId: staffMember.staff_id,
          assignedStaffRole: staffMember.staff_role || 'Crew Member',
          assignedStaffType: staffMember.staff_type || 'In-House',
          status: staffMember.status || 'Assigned',
          equipment: staffMember.equipment || [],
          mobile: staffMember.mobile || ''
        });
      }
    });

    // 5. If no required slots were configured at all, and no staff in pool
    if (mappings.length === 0) {
      if (includedRoles.length > 0) {
        includedRoles.forEach(r => {
          mappings.push({
            teamMemberRole: r,
            assignedStaffName: 'Unassigned',
            status: 'Pending'
          });
        });
      }
    }

    groups.push({
      eventId: evId,
      eventName: eventName,
      eventType: eventType,
      eventDate: eventDate,
      eventStartTime: eventStartTime,
      eventEndDate: eventEndDate,
      eventEndTime: eventEndTime,
      reportingDate: reportingDate,
      reportingTime: reportingTime,
      location: location,
      googleMapsLink: googleMapsLink,
      guestPax: guestPax,
      mappings: mappings
    });
  });

  return groups;
}

export function generateWhatsAppAssignmentMessage(params: {
  order: any;
  lead?: any;
  leadPkgs?: any[];
  staffAssignments?: any[];
  operationsRecord?: any;
  staffList?: any[];
  modalEventAllocations?: any;
  finalAssignments?: any[];
  targetStaffName?: string;
}): string {
  const { order, lead, targetStaffName } = params;
  const groups = getEventTeamMemberStaffMapping(params);

  const orderId = order?.order_id || lead?.lead_id || 'N/A';
  const customerName = order?.customer_name || lead?.customer_name || 'Valued Customer';
  const phone = order?.mobile || lead?.mobile || '';

  let msg = `Order ID: ${orderId}\n`;
  msg += `Customer Name: ${customerName}\n`;
  if (phone) {
    msg += `Phone Number: ${phone}\n`;
  }
  msg += `\n`;

  const totalGroups = groups.length;

  groups.forEach((group, idx) => {
    if (totalGroups > 1) {
      msg += `Event ${idx + 1} — ${group.eventName}\n`;
    } else {
      msg += `Event Name: ${group.eventName}\n`;
      msg += `Event Type: ${group.eventType}\n`;
    }

    if (group.eventDate && group.eventDate !== 'N/A') {
      msg += `Event Date: ${group.eventDate}\n`;
    }
    if (group.eventStartTime && group.eventStartTime !== 'N/A') {
      msg += `Event Time: ${group.eventStartTime}\n`;
    }
    if (group.reportingDate && group.reportingDate !== 'N/A' && group.reportingDate !== group.eventDate) {
      msg += `Reporting Date: ${group.reportingDate}\n`;
    }
    if (group.reportingTime && group.reportingTime !== 'N/A') {
      msg += `Reporting Time: ${group.reportingTime}\n`;
    }
    if (group.location && group.location !== 'N/A') {
      msg += `Location: ${group.location}\n`;
    }
    if (group.googleMapsLink && group.googleMapsLink !== 'N/A') {
      msg += `Google Maps: ${group.googleMapsLink}\n`;
    }

    msg += `\nTeam Members Included:\n`;
    if (group.mappings.length > 0) {
      group.mappings.forEach(m => {
        msg += `• ${m.teamMemberRole} — ${m.assignedStaffName}\n`;
      });
    } else {
      msg += `• Team details will be updated shortly\n`;
    }

    // Equipment assigned to targetStaffName or overall in this event
    if (targetStaffName) {
      const myMappings = group.mappings.filter(m => m.assignedStaffName.toLowerCase() === targetStaffName.toLowerCase());
      const myEq = Array.from(new Set(myMappings.flatMap(m => m.equipment || []))).filter(Boolean);
      if (myEq.length > 0) {
        msg += `\nAssigned Equipment:\n`;
        myEq.forEach(eq => {
          msg += `- ${eq}\n`;
        });
      }
    } else {
      const allEq = Array.from(new Set(group.mappings.flatMap(m => m.equipment || []))).filter(Boolean);
      if (allEq.length > 0) {
        msg += `\nAssigned Equipment:\n`;
        allEq.forEach(eq => {
          msg += `- ${eq}\n`;
        });
      }
    }

    if (idx < totalGroups - 1) {
      msg += `\n---\n\n`;
    }
  });

  return msg.trim();
}
