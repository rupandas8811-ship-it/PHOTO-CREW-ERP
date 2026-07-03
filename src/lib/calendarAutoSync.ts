import { getAccessTokenSync } from './googleAuth';

function getGoogleEventId(eventId: string) {
  let hex = '';
  for (let i = 0; i < eventId.length; i++) {
    hex += eventId.charCodeAt(i).toString(16);
  }
  return 'erpevent' + hex;
}

// Time format is likely "HH:MM AM/PM" or similar string, sometimes "HH:MM" 24h
function convertToISO(dateStr: string, timeStr?: string) {
  if (!timeStr) return null;
  
  // Clean string
  let t = timeStr.trim();
  let isPM = t.toLowerCase().includes('pm');
  let isAM = t.toLowerCase().includes('am');
  t = t.replace(/am|pm/i, '').trim();
  
  let [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  
  // Assume local time, construct naive ISO then append offset
  // To avoid dealing with local offset complexities, we can just use the browser's local timezone
  const localDate = new Date(`${dateStr}T${hStr}:${mStr}:00`);
  return localDate.toISOString();
}

export const autoSyncEventToGoogle = async (action: 'insert' | 'update' | 'delete', rawEventData: any, eventId?: string) => {
  const eventData = Array.isArray(rawEventData) ? rawEventData[0] : rawEventData;
  const token = getAccessTokenSync();
  if (!token) {
    console.warn('Google Calendar auto-sync skipped: User is not authenticated with Google.');
    return;
  }

  const calendarId = 'primary';
  const finalEventId = eventId || eventData?.id;
  
  if (!finalEventId) {
    console.warn('Google Calendar auto-sync skipped: No event ID available.');
    return;
  }
  
  const gEventId = getGoogleEventId(finalEventId);

  try {
    if (action === 'delete') {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${gEventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) console.log(`Deleted event ${gEventId} from Google Calendar`);
      else console.warn('Failed to delete Google Calendar event', await res.text());
      return;
    }

    const summary = eventData.event_name ? `${eventData.event_name}` : 'Event';
    const startStr = eventData.event_date; // YYYY-MM-DD
    if (!startStr) {
      console.warn('Google Calendar auto-sync skipped: Missing event_date');
      return;
    }
    
    let startObj: any = { date: startStr };
    let endObj: any = { date: startStr };
    
    if (eventData.event_start_time) {
       const iso = convertToISO(startStr, eventData.event_start_time);
       if (iso) startObj = { dateTime: iso };
    }
    
    if (eventData.event_end_time) {
       const iso = convertToISO(startStr, eventData.event_end_time);
       if (iso) endObj = { dateTime: iso };
    }

    // Fallback if end date missing but we have start dateTime
    if (startObj.dateTime && !endObj.dateTime) {
       // Just make it a 1 hour event
       const d = new Date(startObj.dateTime);
       d.setHours(d.getHours() + 1);
       endObj = { dateTime: d.toISOString() };
    }

    // Google API requires start and end to be of the same type (both date, or both dateTime)
    if (startObj.date && endObj.dateTime) {
       startObj = endObj; // fallback logic
    }
    if (startObj.dateTime && endObj.date) {
       endObj = startObj;
    }

    const payload = {
      id: gEventId,
      summary: summary,
      location: eventData.event_location || undefined,
      start: startObj,
      end: endObj
    };

    let method = action === 'insert' ? 'POST' : 'PUT';
    let url = action === 'insert' 
      ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`
      : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${gEventId}`;

    let res = await fetch(url, {
      method,
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // If update fails because not found, try insert
    if (!res.ok && action === 'update' && res.status === 404) {
      res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }
    
    // If insert fails because it already exists, try update
    if (!res.ok && action === 'insert' && res.status === 409) {
       res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${gEventId}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) console.log(`Successfully synced event ${gEventId} to Google Calendar`);
    else console.warn('Failed to sync to Google Calendar', await res.text());
  } catch (err) {
    console.warn('Error syncing to Google Calendar:', err);
  }
};
