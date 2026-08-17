const fs = require('fs');
let content = fs.readFileSync('src/components/BusinessOwnerDashboard.tsx', 'utf8');

const targetStr = `  // Clickable card modal state
  const [selectedCard, setSelectedCard] = useState<string | null>(null);`;
const replaceStr = `  // Clickable card modal state
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenCard = (e: any) => setSelectedCard(e.detail);
    window.addEventListener('open-business-owner-card', handleOpenCard);
    return () => window.removeEventListener('open-business-owner-card', handleOpenCard);
  }, []);`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/BusinessOwnerDashboard.tsx', content);
console.log('Success patch dashboard event');
