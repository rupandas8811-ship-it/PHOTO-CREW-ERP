import sys

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

target = """                    const isStarted = b.taskStatus === 'Event Start' || b.taskStatus === 'Event Complete';
                    const isCompleted = b.taskStatus === 'Event Complete';"""

replacement = """                    const isStarted = b.taskStatus === 'Event Started' || b.taskStatus === 'Event Completed' || b.taskStatus === 'Event Start' || b.taskStatus === 'Event Complete';
                    const isCompleted = b.taskStatus === 'Event Completed' || b.taskStatus === 'Event Complete';"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced isStarted logic!")
else:
    print("Not found isStarted logic!")

with open('src/components/StaffModule.tsx', 'w') as f:
    f.write(content)
