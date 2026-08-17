const fs = require('fs');
let code = fs.readFileSync('src/components/OrderHistoryModal.tsx', 'utf8');

const targetStart = `<div className="space-y-3">
              {filteredHistory.map((item, idx) => (
                <div 
                  key={item.id}`;

const replacement = `<div className="space-y-4">
              {CATEGORY_ORDER.map(cat => {
                const groupItems = groupedHistory[cat];
                if (!groupItems || groupItems.length === 0) return null;
                const isExpanded = expandedSections[cat] ?? true;

                return (
                  <div key={cat} className="border border-zinc-800 rounded-2xl bg-zinc-900/40 overflow-hidden flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleSection(cat)}
                      className="w-full flex items-center justify-between p-4 bg-zinc-900 hover:bg-zinc-800/80 transition-colors border-b border-zinc-800/60 cursor-pointer"
                    >
                      <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 uppercase tracking-wide">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        {cat}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500 font-mono font-bold bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                          {groupItems.length} {groupItems.length === 1 ? 'record' : 'records'}
                        </span>
                        <ChevronDown className={\`w-4 h-4 text-zinc-400 transition-transform duration-200 \${isExpanded ? 'rotate-180' : ''}\`} />
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-3 sm:p-4 space-y-3 bg-zinc-950/30">
                        {groupItems.map((item, idx) => (
                          <div 
                            key={item.id}`;

if (code.includes(targetStart)) {
  code = code.replace(targetStart, replacement);
  console.log('Replaced start of map.');
} else {
  console.log('Could not find targetStart');
}

const targetEnd = `                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}`;

const endReplacement = `                  )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}`;

if (code.includes(targetEnd)) {
  code = code.replace(targetEnd, endReplacement);
  console.log('Replaced end of map.');
} else {
  console.log('Could not find targetEnd');
}

fs.writeFileSync('src/components/OrderHistoryModal.tsx', code);
