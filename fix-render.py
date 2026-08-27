import re

with open('src/components/SalesModule.tsx', 'r') as f:
    content = f.read()

target = """    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    const formattedEvDate = formatDate(evObj.eventDate);
    const metaDetailsStr = `Event Date: ${formattedEvDate}   |   Event Time: ${evObj.eventTime ? formatTime12Hour(evObj.eventTime) : 'N/A'}   |   Event Location: ${evObj.eventLocation || 'N/A'}`;
    doc.text(metaDetailsStr, 15, currentY);
    currentY += 6;"""

replacement = """    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    
    const formattedEvDate = formatDate(evObj.eventDate);
    const formattedEvTime = evObj.eventTime ? formatTime12Hour(evObj.eventTime) : 'N/A';
    const formattedEndDate = formatDate(evObj.eventEndDate);
    const formattedEndTime = evObj.eventEndTime ? formatTime12Hour(evObj.eventEndTime) : 'N/A';
    
    const startStr = `Start: ${formattedEvDate} | ${formattedEvTime}`;
    const endStr = `End: ${formattedEndDate} | ${formattedEndTime}`;
    const locStr = `Location: ${evObj.eventLocation || 'N/A'}`;
    
    doc.text(`${startStr}   |   ${endStr}   |   ${locStr}`, 15, currentY);
    currentY += 6;"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/SalesModule.tsx', 'w') as f:
        f.write(content)
    print("Replaced render 1")
else:
    print("Target 1 not found")

