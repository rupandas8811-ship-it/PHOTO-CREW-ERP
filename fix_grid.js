import fs from 'fs';
let content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

content = content.replace(
  '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">'
);

content = content.replace(
  '<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">'
);

// Second instance
content = content.replace(
  '<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">'
);

content = content.replace(
  '<div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">',
  '<div className="col-span-1 sm:col-span-2 md:col-span-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">'
);

content = content.replace(
  '<div className="grid grid-cols-2 gap-2 text-[10px]">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">'
);

content = content.replace(
  '<div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-850">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-850">'
);

content = content.replace(
  '<div className="grid grid-cols-2 gap-1.5">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">'
);

content = content.replace(
  '<div className="grid grid-cols-3 gap-2">',
  '<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">'
);

// We should also look at other fixed col-span usages that might break on mobile.
content = content.replace(
  '<div className="col-span-2 md:col-span-4">',
  '<div className="col-span-1 sm:col-span-2 md:col-span-4">'
);

content = content.replace(
  '<div className="col-span-2 md:col-span-4">',
  '<div className="col-span-1 sm:col-span-2 md:col-span-4">'
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content, 'utf-8');
console.log("Fixed grids");
