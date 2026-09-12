const assignments = [{event_id: 'ev_1'}, {event_id: 'ev_2'}];
const existingDbAssignments = [];
const metaPayload = {};

const allKnownEvents = Array.from(new Set([
  ...assignments.map(a => a.event_id),
  ...existingDbAssignments.map(ed => ed.event_id),
  ...(metaPayload?.allOrderEvents?.map((e) => e.id) || []),
  ...(metaPayload?.updatedEvents?.map((e) => e.id) || [])
].filter(Boolean))).sort();

console.log(allKnownEvents);
console.log(allKnownEvents.indexOf('ev_1'));
console.log(allKnownEvents.indexOf('ev_2'));
