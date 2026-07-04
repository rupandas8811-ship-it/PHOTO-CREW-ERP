import re

with open('src/components/SalesModule.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("  const hasEventsInclusions = Object.keys(eventInclusionsMap).length > 0;", "")
content = content.replace("  const hasEventsDeliverables = Object.keys(eventDeliverablesMap).length > 0;", "")

prep_replacement = """  });

  const hasEventsInclusions = Object.keys(eventInclusionsMap).length > 0;
  const hasEventsDeliverables = Object.keys(eventDeliverablesMap).length > 0;"""

content = content.replace("  });\n\n  const custRemarks", prep_replacement + "\n\n  const custRemarks")

with open('src/components/SalesModule.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
