const events = [{event_name: 'A'}, {event_name: 'B'}];
const evId = "ev_1";
const evIdx = events.findIndex(e => e.id === evId) || 0;
console.log(evIdx);
