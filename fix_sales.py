with open('/app/applet/src/components/SalesModule.tsx', 'r') as f:
    lines = f.readlines()

# Remove the last 3 lines
lines = lines[:-3]

with open('/app/applet/src/components/SalesModule.tsx', 'w') as f:
    f.writelines(lines)
    f.write("      </div>\n")
    f.write("    </div>\n")
    f.write("  );\n")
    f.write("};\n")
