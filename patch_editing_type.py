with open('src/types.ts', 'r') as f:
    text = f.read()

import re
text = re.sub(
    r"export type EditingStatus =[\s\S]*?;", 
    "export type EditingStatus = 'Raw Footage Received' | 'Editor Assigned' | 'Editing Started' | 'Editing In Progress' | 'Internal QC Review' | 'Revision Required' | 'Ready for Client Review' | 'Client Review Complete' | 'Editing Complete' | 'Project Completed';",
    text
)

with open('src/types.ts', 'w') as f:
    f.write(text)
