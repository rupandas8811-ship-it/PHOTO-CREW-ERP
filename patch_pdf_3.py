import re

with open('src/components/SalesModule.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

prep_regex = re.compile(r'// Prep Deliverables.*?const filteredCombinedList.*?\n\s+}\);', re.DOTALL)
if not prep_regex.search(content):
    print("Could not find prep section")
else:
    print("Found prep section!")

render_regex = re.compile(r'// 2\. Chosen base inclusions table.*?drawDeliverablesTable\(\'PACKAGE INCLUSIONS & DELIVERABLES DETAILED LIST\', filteredCombinedList\);\n  }', re.DOTALL)
if not render_regex.search(content):
    print("Could not find render section")
else:
    print("Found render section!")

