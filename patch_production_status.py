with open('src/components/ProductionModule.tsx', 'r') as f:
    text = f.read()

old_status = """                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            editor.status === 'Active'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {editor.status}
                          </span>
                        </td>"""

new_status = """                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            editor.status === 'Completed' || editor.status === 'Editing Complete'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : editor.status === 'Client Review' || editor.status === 'Review Pending'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : editor.status === 'Editing Started' || editor.status === 'In Progress'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                          }`}>
                            {editor.status}
                          </span>
                        </td>"""

text = text.replace(old_status, new_status)

with open('src/components/ProductionModule.tsx', 'w') as f:
    f.write(text)
