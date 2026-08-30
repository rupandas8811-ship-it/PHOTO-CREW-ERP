const d = new Date('2026-08-21T16:30:00');
const pad = (n) => n.toString().padStart(2, '0');
console.log(`${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear().toString().slice(-2)}`);
