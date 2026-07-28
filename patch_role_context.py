import re

with open('src/components/RoleContext.tsx', 'r') as f:
    text = f.read()

old_logic = """          let nextEditingStatus: EditingStatus = 'Editing Started';
          if (completedTasks === totalTasks && totalTasks > 0) {
            nextEditingStatus = 'Internal QC Review';
          } else if (status === 'Review Pending') {
            nextEditingStatus = 'Internal QC Review';
          } else if (status === 'Revision') {
            nextEditingStatus = 'Revision Required';
          } else if (status === 'In Progress' || status === 'Editing Started') {
            nextEditingStatus = 'Editing In Progress';
          }"""

new_logic = """          let nextEditingStatus: EditingStatus = 'Editing Started';
          if (completedTasks === totalTasks && totalTasks > 0) {
            nextEditingStatus = 'Editing Complete';
          } else if (status === 'Review Pending' || status === 'Client Review') {
            nextEditingStatus = 'Client Review';
          } else if (status === 'Revision') {
            nextEditingStatus = 'Revision Required';
          } else if (status === 'In Progress' || status === 'Editing Started') {
            nextEditingStatus = 'Editing In Progress';
          }"""

text = text.replace(old_logic, new_logic)

with open('src/components/RoleContext.tsx', 'w') as f:
    f.write(text)
