sed -i 's/className="p-4 align-top"/className="px-3 py-2 align-middle"/g' src/components/ProductionModule.tsx
sed -i 's/className="p-4"/className="px-3 py-2 align-middle"/g' src/components/ProductionModule.tsx
sed -i 's/className="p-4 font-bold text-white text-left font-sans"/className="px-3 py-2 font-bold text-white text-left font-sans align-middle"/g' src/components/ProductionModule.tsx
sed -i 's/<span className="text-\[10px\] text-zinc-550 block font-mono">{prod.production_id}<\/span>//g' src/components/ProductionModule.tsx
