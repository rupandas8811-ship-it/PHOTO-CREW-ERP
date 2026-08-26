const fs = require('fs');
let content = fs.readFileSync('src/components/BusinessOwnerDashboard.tsx', 'utf8');

const targetStr = `  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';`;

const replaceStr = `  ExternalLink,
  Image as ImageIcon,
  TrendingUp,
  Briefcase,
  Video
} from 'lucide-react';`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/BusinessOwnerDashboard.tsx', content);
console.log('Success patch imports 2');
