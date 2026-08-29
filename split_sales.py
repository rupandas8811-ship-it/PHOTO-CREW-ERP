import re

with open("src/components/SalesModule.tsx", "r") as f:
    lines = f.readlines()

def write_file(filename, start_line, end_line):
    with open(f"src/components/{filename}", "w") as f:
        f.writelines(lines[start_line-1:end_line])
    print(f"Wrote {filename} (lines {start_line}-{end_line})")

write_file("SalesModule.utils.tsx", 1, 1936)
write_file("SalesModule.Step3Workspace.tsx", 4975, 8042)
write_file("SalesModule.DashboardView.tsx", 9600, 12500)
write_file("SalesModule.Modals.tsx", 12501, len(lines))
