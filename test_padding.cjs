function getEventRolePadding(eventId, slotNumber) {
  const safeId = (eventId || '00000000').replace(/[^a-f0-9]/gi, '0').substring(0, 8).toLowerCase();
  const spaceMap = ['\u2000', '\u2001', '\u2002', '\u2003'];
  const encoded = safeId.split('').map(c => {
    const val = parseInt(c, 16);
    return spaceMap[val >> 2] + spaceMap[val & 3];
  }).join('');
  return encoded + '\u00A0'.repeat(slotNumber || 1);
}

const pad1 = getEventRolePadding("e7b4", 1);
const pad2 = getEventRolePadding("a1f2", 1);
console.log(pad1 === pad2);
console.log(pad1.trim() === "");
