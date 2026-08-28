import re

with open('src/components/SalesModule.tsx', 'r') as f:
    content = f.read()

target = """    const startStr = `Start: ${formattedEvDate} | ${formattedEvTime}`;
    const endStr = `End: ${formattedEndDate} | ${formattedEndTime}`;
    const locStr = `Location: ${evObj.eventLocation || 'N/A'}`;
    
    doc.text(`${startStr}   |   ${endStr}   |   ${locStr}`, 15, currentY);
    currentY += 6;"""

replacement = """    const startStr = `Start: ${formattedEvDate} | ${formattedEvTime}`;
    const endStr = `End: ${formattedEndDate} | ${formattedEndTime}`;
    const locStr = `Location: ${evObj.eventLocation || 'N/A'}`;
    
    doc.text(`${startStr}`, 15, currentY);
    doc.text(`${endStr}`, 70, currentY);
    doc.text(`${locStr}`, 125, currentY);
    currentY += 6;"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/SalesModule.tsx', 'w') as f:
        f.write(content)
    print("Replaced render 2")
else:
    print("Target 2 not found")

