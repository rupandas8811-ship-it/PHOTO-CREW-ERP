function sanitizeSlug(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'role';
}
function generateDeterministicAssignmentId(orderId, eventId, roleName, slotNumber) {
  const cleanOrder = (orderId || 'ORD').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 15);
  const cleanEvent = (eventId || 'ev').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10);
  const roleSlug = sanitizeSlug(roleName).slice(0, 12);
  const rawId = `ASST-${cleanOrder}-${cleanEvent}-${roleSlug}-${slotNumber}`;
  return rawId.length > 50 ? rawId.slice(0, 50) : rawId;
}

console.log(generateDeterministicAssignmentId("ORD1", "ev_1", "Photographer", 1));
console.log(generateDeterministicAssignmentId("ORD1", "ev_2", "Photographer", 1));
console.log(generateDeterministicAssignmentId("ORD1", "ev_3", "Photographer", 1));
