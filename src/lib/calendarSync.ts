import { CalendarEvent } from '../components/UnifiedCalendar';

export const syncToGoogleCalendar = async (events: CalendarEvent[], token: string, onProgress?: (msg: string) => void) => {
  if (onProgress) onProgress('Fetching existing Google Calendar events...');
  
  // First, get the primary calendar ID
  const calendarId = 'primary';

  // We should fetch events to avoid duplicates, but for simplicity we will just insert them.
  // Wait, to avoid duplicates, maybe we can search if an event with the same summary and date exists.
  // Since we are doing a basic sync, let's just insert all.
  // Actually, let's fetch events within a range to avoid duplicates.
  const timeMin = new Date();
  timeMin.setMonth(timeMin.getMonth() - 2); // Get past 2 months
  const timeMax = new Date();
  timeMax.setMonth(timeMax.getMonth() + 6); // Get next 6 months

  const existingRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&maxResults=2500`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!existingRes.ok) {
    throw new Error('Failed to fetch existing Google Calendar events');
  }

  const existingData = await existingRes.json();
  const existingEvents = existingData.items || [];

  let syncedCount = 0;
  
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (onProgress) onProgress(`Syncing event ${i + 1} of ${events.length}...`);
    
    // Check if event already exists by checking summary and start date
    const summary = `${ev.eventType || 'Event'} - ${ev.customerName}`;
    const startStr = ev.date; // YYYY-MM-DD
    
    const exists = existingEvents.find((ge: any) => {
      const isSameSummary = ge.summary === summary;
      const isSameDate = ge.start?.date === startStr || ge.start?.dateTime?.startsWith(startStr);
      return isSameSummary && isSameDate;
    });

    if (exists) {
      continue; // Skip existing
    }

    // Insert new event
    const newEvent = {
      summary: summary,
      description: `Mobile: ${ev.mobile}\nType: ${ev.eventType}\nStatus: ${ev.eventClass}`,
      start: {
        date: startStr,
      },
      end: {
        date: startStr, // All day event
      }
    };

    const insertRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newEvent)
    });

    if (insertRes.ok) {
      syncedCount++;
    } else {
      console.error('Failed to insert event', await insertRes.text());
    }
  }

  if (onProgress) onProgress(`Sync complete! Added ${syncedCount} new events.`);
  return syncedCount;
};
