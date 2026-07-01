import { Lead, Order, Payment, Customer } from './types';

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

