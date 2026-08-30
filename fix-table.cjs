const fs = require('fs');

const leads = fs.readFileSync('/tmp/leads_ui.txt', 'utf8');

const tableStart = leads.indexOf('<table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-max">');
const tableEnd = leads.indexOf('</table>') + 8;
const tableBlock = leads.slice(tableStart, tableEnd);

const portalStart = leads.indexOf('{openActionDropdown && createPortal(');
const portalEnd = leads.lastIndexOf(')}');
// Actually, let's just grab from portalStart up to the end of the 2nd to last div closing.
const afterTable = leads.slice(tableEnd);
const portalBlockMatch = afterTable.match(/\{\/\* Floating Action Dropdown Menu \*\/\}[\s\S]*?createPortal\([\s\S]*?\),[\s\S]*?document\.body[\s\S]*?\)\}/);
const portalBlock = portalBlockMatch ? portalBlockMatch[0] : '';

const helpers = fs.readFileSync('/tmp/prod_helpers.txt', 'utf8');

const template = `import React, { useState, useMemo, useEffect } from 'react';
import { Camera, Calendar, User, Film, UploadCloud, Edit3, Image as ImageIcon, Link as LinkIcon, CheckCircle2, AlertCircle, Eye, EyeOff, Lock, Ban, FileText } from 'lucide-react';
import { formatDateDDMMYY, resolveStorageUrl, uploadProofToStorage, toInputDateFormat, formatINR, parseCustomerProof } from '../../utils';
import { createPortal } from 'react-dom';
import { UnifiedEventDropdownCell } from '../UnifiedEventDropdownCell';
import { getProductionStatus, getAutomatedProductionStatus } from '../../utils';

export const ProductionTaskTable = ({
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
  currentRole = 'Production Team',
  editorsList = [],
  setAssignedEditorsModalProd,
  handleOpenAssignEditor,
  isProjectLocked = () => false,
  setNoteModalLeadId,
  setNoteModalOrderId,
  setNoteModalCustomerName,
  setNoteModalOpen,
  handleOpenResendReviewPopup,
  handleOpenClientAcceptance,
  prepareEditorWhatsappData,
  setSelectedLeadProd,
  setDossierError,
  setDossierSuccessMessage,
  setLeadEditor,
  setLeadStaff,
  setAssignRoleFilter,
  setLeadPriority,
  setLeadFootageStatus,
  setLeadProdStatus,
  setLeadRemarks,
  setLeadStartDate,
  setLeadTargetDeliveryDate,
  setLeadExpectedDeliveryDate,
  setLeadActualDeliveryDate,
  setLeadRawFootageDate,
  setLeadClientReviewDate,
  setLeadClientApprovalDate,
  getRawFootageStatus = () => '',
  logs = [],
  getAssignedEditorsList = () => [],
  getAssignedEditorsText = () => ''
}: any) => {
  const [openActionDropdown, setOpenActionDropdown] = useState<any>(null);
  
  const appliedStartDate = '';
  const appliedEndDate = '';
  const appliedOrdId = '';
  
  const resolveOrderAndLead = (prod: any) => {
    const order = orders?.find((o: any) => o.order_id === prod.tracking_id || o.order_id === prod.order_id) || {};
    return { order, lead: {} };
  };
  
  const leads = productionList;

  ${helpers.replace(/const filteredLeadsList = useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);/, '').replace(/const count.*?;/g, '')}

  const filteredLeadsList = useMemo(() => {
    return (leads || []).filter((prod: any) => {
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

  useEffect(() => {
    const handleGlobalClick = () => {
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

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', template);
console.log('Wrote ProductionTaskTable.tsx');
