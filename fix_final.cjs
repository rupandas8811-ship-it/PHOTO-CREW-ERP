const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

// The user's diff inserted a ton of garbage after `                        <span>📥</span>`
// We need to cut off everything after that and put in the correct footer for the module.

const marker = "                        <span>📥</span>";
const idx = content.lastIndexOf(marker);
if (idx !== -1) {
    const fixedContent = content.substring(0, idx + marker.length) + `
                        <span>Download Reports</span>
                        {isDownloadReportsExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-amber-400 ml-0.5 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5 shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsComparingPkgs(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer border border-transparent text-xs"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
};

export default SalesModule;
`;
    fs.writeFileSync('src/components/SalesModule.tsx', fixedContent, 'utf8');
    console.log("Fixed end of SalesModule.tsx");
} else {
    console.log("Could not find marker");
}
