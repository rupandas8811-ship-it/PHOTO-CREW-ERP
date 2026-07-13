awk '
  /const filteredStaff = useMemo\(\(\) => \{/ {
    print "  const filteredStaff = useMemo(() => {"
    print "    const uniqueStaff = [];"
    print "    const seenNames = new Set();"
    print "    for (const s of (productionStaff || [])) {"
    print "      if (s.status !== \"Active\") continue;"
    print "      const type = s.staff_type || s.Staff_Type || \"In-House\";"
    print "      if (type.toLowerCase() === staffType.toLowerCase()) {"
    print "        if (!seenNames.has(s.name)) {"
    print "          seenNames.add(s.name);"
    print "          uniqueStaff.push(s);"
    print "        }"
    print "      }"
    print "    }"
    print "    return uniqueStaff;"
    skip=1
    next
  }
  skip && /  \}, \[productionStaff, staffType\]\);/ {
    skip=0
    print "  }, [productionStaff, staffType]);"
    next
  }
  !skip { print }
' src/components/ProductionModule.tsx > tmp_dropdown.tsx && mv tmp_dropdown.tsx src/components/ProductionModule.tsx
