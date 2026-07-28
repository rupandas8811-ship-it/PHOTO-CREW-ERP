import re

with open('src/types.ts', 'r') as f:
    text = f.read()

# Fix EditingStatus
old_status = """export type EditingStatus = 'Editor Assigned' | 'Editing Started' | 'Editing In Progress' | 'Internal QC Review' | 'Revision Required' | 'Ready for Client Review' | 'Client Review Complete' | 'Project Completed';"""
new_status = """export type EditingStatus = 'Editor Assigned' | 'Editing Started' | 'Editing In Progress' | 'Internal QC Review' | 'Revision Required' | 'Ready for Client Review' | 'Client Review Complete' | 'Editing Complete' | 'Project Completed';"""

text = text.replace(old_status, new_status)

with open('src/types.ts', 'w') as f:
    f.write(text)
