awk '
  /const { staff, productionStaff/ {
    print "  const { staff, productionStaff, users, leads, assignments, editorAssignments, isDataLoading } = useRole();"
    print "  const [error, setError] = useState<string | null>(null);"
    next
  }
  /const staffMetrics = useMemo/ {
    print "  if (isDataLoading) {"
    print "    return ("
    print "      <div className=\"flex items-center justify-center p-12\">"
    print "        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500\"></div>"
    print "      </div>"
    print "    );"
    print "  }"
    print "  if (error) {"
    print "    return ("
    print "      <div className=\"p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400\">"
    print "        <AlertCircle className=\"w-6 h-6 mb-2\" />"
    print "        <p>{error}</p>"
    print "      </div>"
    print "    );"
    print "  }"
    print "  const staffMetrics = useMemo(() => {"
    print "    try {"
    next
  }
  /return \[\.\.\.salesStaffMetrics, \.\.\.opsStaffMetrics, \.\.\.prodStaffMetrics\];/ {
    print "      return [...salesStaffMetrics, ...opsStaffMetrics, ...prodStaffMetrics];"
    print "    } catch (err: any) {"
    print "      console.error(\"Error calculating staff metrics:\", err);"
    print "      setTimeout(() => setError(err.message), 0);"
    print "      return [];"
    print "    }"
    next
  }
  { print }
' src/components/analytics/owner/OwnerStaffPerformanceDetailed.tsx > tmp.tsx && mv tmp.tsx src/components/analytics/owner/OwnerStaffPerformanceDetailed.tsx
