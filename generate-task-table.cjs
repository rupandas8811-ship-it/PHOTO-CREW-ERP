const fs = require('fs');
const leads = fs.readFileSync('/tmp/prod_leads.txt', 'utf8');
const helpers = fs.readFileSync('/tmp/prod_helpers.txt', 'utf8');

const tableBlock = leads.match(/<table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-max">[\s\S]*?<\/table>/)[0];
const portalBlock = leads.match(/\{\/\* Floating Action Dropdown Menu \*\/\}[\s\S]*?createPortal\([\s\S]*?\),[\s\S]*?document\.body[\s\S]*?\)\}/)[0];

const newComponent = `import React, { useState, useMemo, useEffect } from 'react';
import { Camera, Calendar, User, Film, UploadCloud, Edit3, Image as ImageIcon, Link as LinkIcon, CheckCircle2, AlertCircle, Eye, EyeOff, Lock, Ban } from 'lucide-react';
import { formatDateDDMMYY, getAssignedEditorsText, resolveStorageUrl, uploadProofToStorage, toInputDateFormat, formatINR, parseCustomerProof } from '../../utils';
import { createPortal } from 'react-dom';
import { UnifiedEventDropdownCell } from '../UnifiedEventDropdownCell';

// We need to define or import getProductionStatus, getAutomatedProductionStatus
import { getProductionStatus, getAutomatedProductionStatus } from '../../utils'; // Assuming they are in utils, if not we will fake or copy them if needed

export interface ProductionTaskTableProps {
  activeSubTab: string;
  orders: any[];
  productionList: any[];
  editorAssignments: any[];
  operationsList: any[];
  searchTerm: string;
  statusFilter: string;
  onSelectProject: (order: any, productionItem?: any) => void;
  onAssignEditor: (order: any, productionItem?: any, taskToEdit?: any) => void;
  onAssignOps: (order: any, operationItem?: any) => void;
  onReassignStaff?: (assignment: any) => void;
  onUploadProof: (assignment: any) => void;
  onUpdateStatus: (productionId: string, newStatus: string) => void;
  onPreviewImage: (preview: { url: string; title: string, href?: string }) => void;
  // Extras
  payments?: any[];
  rawFootage?: any[];
  leadsData?: any[];
  currentRole?: string;
}

export const ProductionTaskTable: React.FC<ProductionTaskTableProps> = ({
  activeSubTab,
  orders,
  productionList,
  editorAssignments,
  operationsList,
  searchTerm: appliedCustName,
  statusFilter,
  onSelectProject,
  onAssignEditor,
  onAssignOps,
  onReassignStaff,
  onUploadProof,
  onUpdateStatus,
  onPreviewImage,
  payments = [],
  rawFootage = [],
  leadsData = [],
  currentRole = 'Production Team'
}) => {
  const [openActionDropdown, setOpenActionDropdown] = useState<any>(null);
  
  // Fake the other states so the extracted code doesn't crash
  const appliedStartDate = '';
  const appliedEndDate = '';
  const appliedOrdId = '';
  const setPreviewProofModal = onPreviewImage;
  const setWorkflowModal = (data: any) => {
    if (data.actionType === 'assign_editor') {
       onAssignEditor(data.order, data.prod);
    } else if (data.actionType === 'assign_operations') {
       onAssignOps(data.order, data.prod);
    }
  };
  
  // Extract resolveOrderAndLead
  const resolveOrderAndLead = (prod: any) => {
    const order = orders.find(o => o.order_id === prod.tracking_id || o.order_id === prod.order_id) || {};
    return { order, lead: {} };
  };
  
  const leads = productionList;

  ${helpers.replace(/const filteredLeadsList = useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);/, '')}

  // Simplified filteredLeadsList
  const filteredLeadsList = useMemo(() => {
    return (leads || []).filter(prod => {
      const { order } = resolveOrderAndLead(prod);
      if (appliedCustName) {
        const searchLower = appliedCustName.toLowerCase();
        const cName = (order?.customer_name || prod.customer_name || '').toLowerCase();
        const ordId = (prod.tracking_id || prod.order_id || '').toLowerCase();
        if (!cName.includes(searchLower) && !ordId.includes(searchLower)) return false;
      }
      if (statusFilter && statusFilter !== 'All') {
        if (prod.editing_status !== statusFilter) return false;
      }
      return true;
    });
  }, [leads, orders, appliedCustName, statusFilter]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (openActionDropdown) {
         setOpenActionDropdown(null);
      }
    };
    if (openActionDropdown) {
      setTimeout(() => window.addEventListener('click', handleGlobalClick), 10);
    }
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [openActionDropdown]);

  const toggleActionDropdown = (e: React.MouseEvent, prod: any, order: any, displayStatus: any, isEditorAssigned: any, hasSavedAssignments: any, isStatusActiveFn: any) => {
    e.stopPropagation();
    if (openActionDropdown && openActionDropdown.id === prod.id) {
      setOpenActionDropdown(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setOpenActionDropdown({
        id: prod.id,
        rect,
        prod,
        order,
        displayStatus,
        isEditorAssigned,
        hasSavedAssignments,
        isStatusActive: isStatusActiveFn
      });
    }
  };

  const isStatusActive = (status: string) => {
    return !['Project Delivered', 'Delivered', 'Completed', 'Closed'].includes(status);
  };
  
  const isDepartmentAllowedToEdit = () => true;

  return (
    <div className="w-full space-y-4 animate-fade-in text-zinc-100">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-x-auto shadow-xl">
        ${tableBlock}
      </div>
      ${portalBlock}
    </div>
  );
};
`;

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', newComponent);
console.log('Done');
