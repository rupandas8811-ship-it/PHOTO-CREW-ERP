import fs from 'fs';
let txt = fs.readFileSync('bun.lock', 'utf8');
txt = txt.replace(/,\s*\}/g, '}').replace(/,\s*\]/g, ']');
fs.writeFileSync('bun.lock', txt);
