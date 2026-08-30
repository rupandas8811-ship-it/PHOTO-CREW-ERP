const fs = require('fs');

let code = fs.readFileSync('src/components/ProductionDashboardModule.tsx', 'utf8');

const states = `
  const [isAssignEditorOpen, setIsAssignEditorOpen] = useState(false);
  const [isAssignOpsOpen, setIsAssignOpsOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isProofUploadOpen, setIsProofUploadOpen] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedProduction, setSelectedProduction] = useState<any>(null);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState<any>(null);
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [selectedAssignmentForReassign, setSelectedAssignmentForReassign] = useState<any>(null);
  const [selectedAssignmentForProof, setSelectedAssignmentForProof] = useState<any>(null);
`;

code = code.replace(/export const ProductionDashboardModule: React\.FC<ProductionDashboardModuleProps> = \(\{[\s\S]*?\}\) => \{/, (match) => {
  return match + "\n" + states;
});

// also need to import those missing modals
const imports = `
import { AssignEditorModal } from './production/AssignEditorModal';
import { AssignOperationsStaffModal } from './production/AssignOperationsStaffModal';
import { ReassignStaffModal } from './production/ReassignStaffModal';
import { ProductionProofUploadModal } from './production/ProductionProofUploadModal';
`;

code = code.replace(/import \{ ProductionTaskTable \} from '.\/production\/ProductionTaskTable';/, (match) => {
  return match + "\n" + imports;
});

fs.writeFileSync('src/components/ProductionDashboardModule.tsx', code);
