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
