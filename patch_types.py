import re

with open('src/types.ts', 'r') as f:
    text = f.read()

# Fix EditorAssignment status
old_type = """  status: 'Assigned' | 'Editing Started' | 'In Progress' | 'Review Pending' | 'Revision' | 'Completed'
  | 'Project Completed';"""
new_type = """  status: 'Assigned' | 'Editing Started' | 'Client Review' | 'Editing Complete' | 'In Progress' | 'Review Pending' | 'Revision' | 'Completed' | 'Project Completed';"""

text = text.replace(old_type, new_type)

with open('src/types.ts', 'w') as f:
    f.write(text)
