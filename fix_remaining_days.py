import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

# Replace calculation
calc_start = """                      const payStatus = payment?.payment_status || 'Pending';"""
calc_end = """                      } else {
                        if (isFinished) {
                          flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                          flagLabel = 'Completed';
                        }
                      }"""

calc_new = """                      const payStatus = payment?.payment_status || 'Pending';

                      const isFinished = displayStatus === 'Completed' || 
                                         displayStatus === 'Project Delivered' || 
                                         displayStatus === 'Project Closed' ||
                                         displayStatus === 'Delivered' ||
                                         displayStatus === 'Closed' ||
                                         prod.production_status === 'Completed' ||
                                         prod.production_status === 'Project Delivered' ||
                                         prod.production_status === 'Project Closed' ||
                                         prod.production_status === 'Delivered' ||
                                         prod.production_status === 'Closed' ||
                                         prod.editing_status === 'Completed' ||
                                         prod.editing_status === 'Project Delivered' ||
                                         prod.editing_status === 'Project Closed' ||
                                         prod.editing_status === 'Delivered' ||
                                         prod.editing_status === 'Closed';

                      const isAssigned = getAssignedEditorsList(prod).length > 0 || (prod.editor_assigned && prod.editor_assigned !== 'Unassigned');

                      let flagBg = 'text-green-400 bg-green-500/5 border-green-500/10';
                      let flagLabel = 'On Time';
                      
                      if (!isAssigned) {
                        flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                        flagLabel = 'Pending';
                      } else if (daysRem !== null) {
                        if (daysRem < 0) {
                          if (isFinished) {
                            flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                            flagLabel = 'Completed';
                          } else {
                            flagBg = 'text-red-400 bg-red-500/5 border-red-500/10 font-bold';
                            flagLabel = 'OVERDUE';
                          }
                        } else if (daysRem <= 3) {
                          if (isFinished) {
                            flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                            flagLabel = 'Completed';
                          } else {
                            flagBg = 'text-yellow-400 bg-yellow-500/5 border-yellow-500/10';
                            flagLabel = 'Due Soon';
                          }
                        } else {
                          if (isFinished) {
                            flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                            flagLabel = 'Completed';
                          }
                        }
                      } else {
                        if (isFinished) {
                          flagBg = 'text-zinc-500 bg-zinc-900/30 border-zinc-800';
                          flagLabel = 'Completed';
                        }
                      }"""

start_idx = content.find(calc_start)
end_idx = content.find(calc_end, start_idx) + len(calc_end)
if start_idx == -1 or end_idx == -1:
    print("Could not find calc section.")
else:
    content = content[:start_idx] + calc_new + content[end_idx:]


render_start = """                          {/* Remaining Days */}
                          <td className="p-4">
                            {daysRem !== null ? (
                              <span className={`inline-flex px-2 py-0.5 rounded font-bold border font-mono ${flagBg}`}>
                                {flagLabel === 'Completed' ? 'Completed' : `${daysRem} days (${flagLabel})`}
                              </span>
                            ) : (
                              <span className="text-zinc-600 italic">Not set</span>
                            )}
                          </td>"""

render_new = """                          {/* Remaining Days */}
                          <td className="p-4">
                            {!isAssigned ? (
                              <span className={`inline-flex px-2 py-0.5 rounded font-bold border font-mono ${flagBg}`}>
                                Pending
                              </span>
                            ) : daysRem !== null ? (
                              <span className={`inline-flex px-2 py-0.5 rounded font-bold border font-mono ${flagBg}`}>
                                {flagLabel === 'Completed' ? 'Completed' : flagLabel === 'OVERDUE' ? `Overdue by ${Math.abs(daysRem)} Days` : `${daysRem} days (${flagLabel})`}
                              </span>
                            ) : (
                              <span className="text-zinc-600 italic text-[10px]">Not set</span>
                            )}
                          </td>"""

r_idx = content.find(render_start)
if r_idx == -1:
    print("Could not find render section.")
else:
    content = content[:r_idx] + render_new + content[r_idx+len(render_start):]

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(content)
print("Updated Remaining Days successfully")
