import re

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

target = """                        <td className="py-4 px-6">
                          <div className="font-bold text-zinc-100">{b.eventName}</div>
                          <div className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-1 flex-wrap">
                            <span>{formatDateDDMMYY(b.eventDate)}</span>
                            {b.eventStartTime && b.eventStartTime !== 'N/A' && (
                              <span className="text-zinc-500">• {formatTime12Hour(b.eventStartTime)}</span>
                            )}
                          </div>
                          {b.shootType && b.shootType !== 'N/A' && (
                            <div className="text-[10px] font-mono uppercase text-zinc-500 mt-0.5">
                              {b.shootType}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                            {b.assignedRole}
                          </span>
                        </td>"""

replacement = """                        <td className="py-4 px-6">
                          <StaffEventDetailsCell b={b} />
                        </td>
                        <td className="py-4 px-6">
                          <StaffReportingDetailsCell b={b} />
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold whitespace-nowrap">
                            {b.assignedRole}
                          </span>
                        </td>"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/StaffModule.tsx', 'w') as f:
        f.write(content)
    print("Replaced TD")
else:
    print("Target not found")
