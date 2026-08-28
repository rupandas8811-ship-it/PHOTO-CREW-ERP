import re

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

target1 = """      <div className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-1 flex-wrap">
        <span>{formatDateDDMMYY(b.eventDate)}</span>
        {b.eventStartTime && b.eventStartTime !== 'N/A' && (
          <span className="text-zinc-500">• {formatTime12Hour(b.eventStartTime)}</span>
        )}
      </div>"""

replacement1 = """      <div className="text-xs text-zinc-400 font-mono mt-1 flex flex-col gap-0.5">
        <span>{formatDateDDMMYY(b.eventDate)}</span>
        {b.eventStartTime && b.eventStartTime !== 'N/A' && (
          <span className="text-zinc-500">{formatTime12Hour(b.eventStartTime)}</span>
        )}
      </div>"""

target2 = """      <div className="text-xs text-zinc-300 font-mono flex items-center gap-1 flex-wrap">
        {repDate !== 'N/A' ? (
          <>
            <span className="font-bold">{formatDateDDMMYY(repDate)}</span>
            {repTime !== 'N/A' && (
              <span className="text-zinc-500 font-normal">• {formatTime12Hour(repTime)}</span>
            )}
          </>
        ) : (
          <span className="text-zinc-600">Not set</span>
        )}
      </div>"""

replacement2 = """      <div className="text-xs text-zinc-300 font-mono flex flex-col gap-0.5">
        {repDate !== 'N/A' ? (
          <>
            <span className="font-bold">{formatDateDDMMYY(repDate)}</span>
            {repTime !== 'N/A' && (
              <span className="text-zinc-500 font-normal">{formatTime12Hour(repTime)}</span>
            )}
          </>
        ) : (
          <span className="text-zinc-600">Not set</span>
        )}
      </div>"""

if target1 in content and target2 in content:
    content = content.replace(target1, replacement1).replace(target2, replacement2)
    with open('src/components/StaffModule.tsx', 'w') as f:
        f.write(content)
    print("Fixed stacking")
else:
    print("Targets not found")
