const fs = require('fs');
let code = fs.readFileSync('src/components/OrderHistoryModal.tsx', 'utf8');

const targetSpan = `                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-950 text-zinc-400 border border-zinc-800">
                        {item.category}
                      </span>`;

if (code.includes(targetSpan)) {
  code = code.replace(targetSpan, '');
  console.log('Removed duplicate category tag from item.');
} else {
  console.log('Target span not found.');
}

fs.writeFileSync('src/components/OrderHistoryModal.tsx', code);
