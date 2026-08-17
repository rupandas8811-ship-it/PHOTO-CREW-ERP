const fs = require('fs');
let content = fs.readFileSync('src/components/BusinessOwnerDashboard.tsx', 'utf8');

const targetStr = `import { 
  Building2, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Download,
  Calendar as CalendarIcon,
  Filter,
  Search,
  FileText,
  Mail,
  Phone,
  Image as ImageIcon,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Ban,
  Activity
} from 'lucide-react';`;

const replaceStr = `import { 
  Building2, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Download,
  Calendar as CalendarIcon,
  Filter,
  Search,
  FileText,
  Mail,
  Phone,
  Image as ImageIcon,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Ban,
  Activity,
  TrendingUp,
  Briefcase,
  Video
} from 'lucide-react';`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/BusinessOwnerDashboard.tsx', content);
console.log('Success patch imports');
