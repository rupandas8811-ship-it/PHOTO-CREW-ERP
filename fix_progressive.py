import sys

with open('src/components/RoleContext.tsx', 'r') as f:
    content = f.read()

target = """          const allEditingStarted = totalTasks > 0 && allTasks.every(t => t.status === 'In Progress' || t.status === 'Editing Started');
          const allClientReview = totalTasks > 0 && allTasks.every(t => t.status === 'Review Pending' || t.status === 'Client Review');
          const allEditingComplete = totalTasks > 0 && allTasks.every(t => t.status === 'Completed' || t.status === 'Editing Complete');
          
          let nextEditingStatus: EditingStatus | undefined = undefined;
          
          if (allEditingStarted) {
            nextEditingStatus = 'Editing Started';
          } else if (allClientReview) {
            nextEditingStatus = 'Client Review';
          } else if (allEditingComplete) {
            nextEditingStatus = 'Editing Complete';
          }"""

replacement = """          const hasTasks = totalTasks > 0;
          const allReachedStarted = hasTasks && allTasks.every(t => ['In Progress', 'Editing Started', 'Review Pending', 'Client Review', 'Completed', 'Editing Complete'].includes(t.status));
          const allReachedReview = hasTasks && allTasks.every(t => ['Review Pending', 'Client Review', 'Completed', 'Editing Complete'].includes(t.status));
          const allReachedComplete = hasTasks && allTasks.every(t => ['Completed', 'Editing Complete'].includes(t.status));
          
          let nextEditingStatus: EditingStatus | undefined = undefined;
          
          if (allReachedComplete) {
            nextEditingStatus = 'Editing Complete';
          } else if (allReachedReview) {
            nextEditingStatus = 'Client Review';
          } else if (allReachedStarted) {
            nextEditingStatus = 'Editing Started';
          }"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced progressive logic!")
else:
    print("Not found progressive logic!")

with open('src/components/RoleContext.tsx', 'w') as f:
    f.write(content)
