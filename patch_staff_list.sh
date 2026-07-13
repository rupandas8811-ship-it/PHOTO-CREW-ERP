awk '
  /} = useRole();/ {
    print
    print "  const productionStaffList = useMemo(() => {"
    print "    return (staff || []).filter(s => s.department === \"Post-Production\" || s.role === \"Editor\" || s.Staff_Type || (s.Skill && s.Skill.length > 0));"
    print "  }, [staff]);"
    next
  }
  { print }
' src/components/ProductionModule.tsx > tmp3.tsx && mv tmp3.tsx src/components/ProductionModule.tsx
