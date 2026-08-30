import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

replacement = """                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold uppercase rounded-xl transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Saving Assignments...</span>
                    </>
                  ) : (
                    'Save All Assignments'
                  )}
                </button>"""

orig = """                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold uppercase rounded-xl transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  {isSaving ? 'Saving Assignments...' : 'Save All Assignments'}
                </button>"""

content = content.replace(orig, replacement)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)

