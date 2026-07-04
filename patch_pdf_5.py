import re

with open('src/components/SalesModule.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix startswith
content = content.replace('.startswith(', '.startsWith(')

sim_regex = re.compile(r'    if \(baseServices\.length > 0\) \{.*?    if \(filteredCombinedList\.length > 0\) \{.*?          currentTableY \+= rowH;\n        \}\);\n        simY = currentTableY;\n      \}\n      simY \+= cfg\.tableSpacing;\n    \}', re.DOTALL)

new_sim = """    const simTable = (items: any[]) => {
      let tableH = 4 + 7.5; 
      items.forEach((item) => {
        tableH += Math.max(7.5, 1 * cfg.rowTextHeight + cfg.rowPadding);
      });
      if (simY + tableH > 250 && tableH <= (250 - 52)) {
        simY = 52;
        simPageCount++;
      } else {
        let currentTableY = simY + 4 + 7.5;
        items.forEach((item) => {
          const rowH = Math.max(7.5, 1 * cfg.rowTextHeight + cfg.rowPadding);
          if (currentTableY + rowH > 250) {
            currentTableY = 52 + 7.5;
            simPageCount++;
          }
          currentTableY += rowH;
        });
        simY = currentTableY;
      }
      simY += cfg.tableSpacing;
    };

    if (hasEventsInclusions) {
      Object.entries(eventInclusionsMap).forEach(([_, members]) => simTable(members));
    } else if (generalInclusions.length > 0) {
      simTable(generalInclusions);
    }
    
    if (hasEventsDeliverables) {
      Object.entries(eventDeliverablesMap).forEach(([_, data]) => simTable(data.items));
    } else if (generalDeliverables.length > 0) {
      simTable(generalDeliverables);
    }"""

content = sim_regex.sub(new_sim, content)

with open('src/components/SalesModule.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
