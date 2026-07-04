import re

with open('src/components/SalesModule.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

prep_regex = re.compile(r'// Prep Deliverables.*?const filteredCombinedList.*?\n\s+}\);', re.DOTALL)

new_prep = """  // NEW PREP FOR TEAM MEMBERS (INCLUSIONS) AND DELIVERABLES
  const eventInclusionsMap: Record<string, string[]> = {};
  const eventDeliverablesMap: Record<string, { pkgName: string, items: string[] }> = {};
  let generalInclusions: string[] = [];
  let generalDeliverables: { pkgName: string, items: string[] }[] = [];

  activePkgs.forEach((pkg) => {
    const pkgId = pkg.package_id || pkg.id || 'default';
    const pkgName = pkg.package_name || pkg.name || 'Base Package';

    const incKeys = Object.keys(editableInclusions || {}).filter(k => k.startswith(f"{pkgId}_"));
    if (incKeys.length > 0) {
      incKeys.forEach((key) => {
        const eventId = key.substring(pkgId.length + 1);
        const eventObj = (lead.events || []).find((e: any) => e.id === eventId);
        const eventName = eventObj ? eventObj.event_name : 'Event';
        if (!eventInclusionsMap[eventName]) eventInclusionsMap[eventName] = [];
        eventInclusionsMap[eventName].push(...(editableInclusions![key] || []).filter(Boolean));
      });
    } else {
      generalInclusions.push(...(editableInclusions?.[pkgId] || []).filter(Boolean));
    }

    const delKeys = Object.keys(editableDeliverables || {}).filter(k => k.startswith(f"{pkgId}_"));
    if (delKeys.length > 0) {
      delKeys.forEach((key) => {
        const eventId = key.substring(pkgId.length + 1);
        const eventObj = (lead.events || []).find((e: any) => e.id === eventId);
        const eventName = eventObj ? eventObj.event_name : 'Event';
        if (!eventDeliverablesMap[eventName]) eventDeliverablesMap[eventName] = { pkgName, items: [] };
        eventDeliverablesMap[eventName].items.push(...(editableDeliverables![key] || []).filter(Boolean));
      });
    } else {
      generalDeliverables.push({ pkgName, items: (editableDeliverables?.[pkgId] || []).filter(Boolean) });
    }
  });"""

new_prep = new_prep.replace('f"{pkgId}_"', '`${pkgId}_`')

content = prep_regex.sub(new_prep, content)


render_regex = re.compile(r'// 2\. Chosen base inclusions table.*?drawDeliverablesTable\(\'PACKAGE INCLUSIONS & DELIVERABLES DETAILED LIST\', filteredCombinedList\);\n  }', re.DOTALL)

new_render = """  // 2. Team Members Included section
  const drawTeamMembers = (eventName: string | null, members: string[]) => {
    if (members.length === 0) return;
    const title = eventName ? `${eventName} - TEAM MEMBERS INCLUDED` : 'TEAM MEMBERS INCLUDED';
    const mapped = members.map((m, i) => ({ id: String(i), name: m, qty: 1, price: 0 }));
    drawTable(title, mapped);
  };

  const hasEventsInclusions = Object.keys(eventInclusionsMap).length > 0;
  if (hasEventsInclusions) {
    Object.entries(eventInclusionsMap).forEach(([eventName, members]) => {
      drawTeamMembers(eventName, members);
    });
  } else if (generalInclusions.length > 0) {
    drawTeamMembers(null, generalInclusions);
  }

  // 3. Additional services table
  if (additionalServices.length > 0) {
    drawTable('ADDITIONAL SPECIFICATIONS & SERVICE ADD-ONS', additionalServices);
  }

  // 4. Deliverables table
  const drawNewDeliverablesTable = (eventName: string | null, data: { pkgName: string, items: string[] }[]) => {
    if (data.length === 0) return;
    const title = eventName ? `${eventName} - PACKAGE INCLUSIONS & DELIVERABLES DETAILED LIST` : 'PACKAGE INCLUSIONS & DELIVERABLES DETAILED LIST';
    
    // Create flattened list
    const list: { type: 'pkgName' | 'header' | 'item', text: string }[] = [];
    data.forEach(d => {
      if (d.items.length === 0) return;
      list.push({ type: 'pkgName', text: `Package Name: ${d.pkgName}` });
      list.push({ type: 'header', text: `Deliverables` });
      d.items.forEach(item => {
        list.push({ type: 'item', text: item });
      });
    });

    if (list.length === 0) return;

    let tableH = 4 + 7.5; 
    list.forEach((item) => {
      const wrapped = doc.splitTextToSize(cleanText(item.text), 166);
      tableH += Math.max(7.5, wrapped.length * cfg.rowTextHeight + cfg.rowPadding);
    });

    if (currentY + tableH > 250 && tableH <= (250 - 52)) {
      currentY = createNewPage();
    }
    if (currentY + 4 > 250) {
      currentY = createNewPage();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(title, 15, currentY);
    currentY += 4;

    if (currentY + 7.5 > 250) {
      currentY = createNewPage();
    }
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(15, currentY, 180, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('DELIVERABLES', 19, currentY + 4.8);

    currentY += 7.5;

    doc.setDrawColor(203, 213, 225); 
    doc.setLineWidth(0.2);

    list.forEach((item, index) => {
      const cleanedText = cleanText(item.text || '');
      const wrappedText = doc.splitTextToSize(cleanedText, 166);
      const rowHeight = Math.max(7.5, wrappedText.length * cfg.rowTextHeight + cfg.rowPadding);

      if (currentY + rowHeight > 250) {
        doc.line(15, currentY, 195, currentY);
        currentY = createNewPage();

        doc.setFillColor(30, 41, 59);
        doc.rect(15, currentY, 180, 7.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('DELIVERABLES (CONTINUED)', 19, currentY + 4.8);
        currentY += 7.5;
      }

      if (item.type === 'pkgName' || item.type === 'header') {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, rowHeight, 'F');
      }

      doc.line(15, currentY, 15, currentY + rowHeight);
      doc.line(195, currentY, 195, currentY + rowHeight);

      if (item.type === 'pkgName') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
      } else if (item.type === 'header') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.setFillColor(51, 65, 85);
        doc.circle(20, currentY + 4.3 - 0.9, 0.6, 'F');
      }

      wrappedText.forEach((line: string, i: number) => {
        const xOffset = item.type === 'item' ? 23 : 19;
        doc.text(line, xOffset, currentY + 4.3 + (i * cfg.rowTextHeight));
      });

      doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
      currentY += rowHeight;
    });

    currentY += cfg.tableSpacing; 
  };

  const hasEventsDeliverables = Object.keys(eventDeliverablesMap).length > 0;
  if (hasEventsDeliverables) {
    Object.entries(eventDeliverablesMap).forEach(([eventName, data]) => {
      drawNewDeliverablesTable(eventName, [data]);
    });
  } else if (generalDeliverables.length > 0) {
    drawNewDeliverablesTable(null, generalDeliverables);
  }"""

content = render_regex.sub(new_render, content)

with open('src/components/SalesModule.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
