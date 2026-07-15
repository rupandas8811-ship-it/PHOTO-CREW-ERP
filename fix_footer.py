import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target_start = """            {/* Footer */}"""
target_end = """              </button>
            </div>
          </div>
        </div>
      )}"""

start_idx = content.find(target_start)
end_idx = content.find(target_end, start_idx) + len("""              </button>
            </div>
          </div>
        </div>
      )}""")

if start_idx == -1 or end_idx == -1:
    print("Could not find section.")
    exit(1)

new_content = """            {/* Footer */}
            <div className="p-4 border-t border-zinc-900 bg-[#0c0d10] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditorWhatsappModalOpen(false);
                  setEditorWhatsappData(null);
                  setEditorWhatsappError(null);
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 text-zinc-400 hover:text-white text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}"""

updated = content[:start_idx] + new_content + content[end_idx:]

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(updated)
print("Updated Footer successfully")
