awk '
  /td className="p-3 text-emerald-400">\{editor.deliverable\}<\/td>/ {
    print "                        <td className=\"p-3\">"
    print "                          <div className=\"flex flex-wrap gap-1\">"
    print "                            {(editor.deliverables || editor.deliverable?.split(\",\") || []).map((del: string, i: number) => ("
    print "                              <span key={i} className=\"px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono font-bold uppercase\">"
    print "                                {del.trim()}"
    print "                              </span>"
    print "                            ))}"
    print "                          </div>"
    print "                        </td>"
    next
  }
  { print }
' src/components/ProductionModule.tsx > tmp2.tsx && mv tmp2.tsx src/components/ProductionModule.tsx
