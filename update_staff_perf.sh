awk '
  /const { staff, productionStaff, users, leads, assignments, editorAssignments, isDataLoading } = useRole();/ {
    print "  const { staff, productionStaff, users, leads, orders, production, assignments, editorAssignments, isDataLoading } = useRole();"
    next
  }
  { print }
' src/components/analytics/owner/OwnerStaffPerformanceDetailed.tsx > tmp.tsx && mv tmp.tsx src/components/analytics/owner/OwnerStaffPerformanceDetailed.tsx
