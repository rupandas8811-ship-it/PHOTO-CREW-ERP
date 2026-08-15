const fs = require('fs');
let code = fs.readFileSync('src/components/OrderHistoryModal.tsx', 'utf8');

code = code.replace(/import \{([^\}]+)\} from 'lucide-react';/, "import {$1, ChevronDown} from 'lucide-react';");

code = code.replace(
  /const \[selectedCategory, setSelectedCategory\] = useState<string>\('All'\);/,
  `const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !(prev[section] ?? true) }));
  };`
);

code = code.replace(
  /\/\/ Filtered list based on Search & Category[\s\S]*?\}, \[historyItems, selectedCategory, searchTerm\]\);/,
  `// Filtered list based on Search
  const filteredHistory = useMemo(() => {
    return historyItems.filter(item => {
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      return (
        item.activity.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.staffName.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.formattedDate.toLowerCase().includes(query)
      );
    });
  }, [historyItems, searchTerm]);

  const CATEGORY_ORDER = ['Sales', 'Operations', 'Production', 'Client Consent', 'Payment', 'Other'];

  const groupedHistory = useMemo(() => {
    const groups: Record<string, typeof filteredHistory> = {};
    filteredHistory.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredHistory]);`
);

code = code.replace(
  /<div className="p-3 sm:p-4 bg-zinc-900\/40 border-b border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">[\s\S]*?\{\/\* Search & Sort \*\/\}[\s\S]*?<div className="flex items-center gap-2 w-full sm:w-auto">/,
  `<div className="p-3 sm:p-4 bg-zinc-900/40 border-b border-zinc-850 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
          
          {/* Search & Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto">`
);

fs.writeFileSync('src/components/OrderHistoryModal.tsx', code);
