// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useRole } from './RoleContext';
import { ProductionHeader } from './production/ProductionHeader';
import { ProductionTaskTable } from './production/ProductionTaskTable';


import { ProductionStaffDirectory } from './production/ProductionStaffDirectory';
import { ProductionWorkloadAnalytics } from './production/ProductionWorkloadAnalytics';




import { ProductionDetailsModal } from './production/ProductionDetails';
import { ProductionWorkflowModal } from './production/ProductionWorkflowModal';
import { X, Eye } from 'lucide-react';

export interface ProductionDashboardModuleProps {
  activeSubTab?: string;
  setActiveSubTab?: (tab: string) => void;
}

export const ProductionDashboardModule: React.FC<ProductionDashboardModuleProps> = ({
  activeSubTab: externalSubTab,
  setActiveSubTab: setExternalSubTab
}) => {

  const [isAssignEditorOpen, setIsAssignEditorOpen] = useState(false);
  const [isAssignOpsOpen, setIsAssignOpsOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isProofUploadOpen, setIsProofUploadOpen] = useState(false);

            
  const { 
    orders = [], 
    production = [], 
    editorAssignments = [], 
    operations = [],
    staff = [],
    productionStaff = [],
    rawFootage = [],
    logs = [],
    payments = [],
    leads = [],
    refreshData,
    pushUpdate,
    logActivity,
    currentUserName
  } = useRole();

  // Internal tab state if not controlled externally
  const [internalSubTab, setInternalSubTab] = useState('overview');
  const activeSubTab = externalSubTab || internalSubTab;

  const handleSubTabChange = (tab: string) => {
    if (setExternalSubTab) {
      setExternalSubTab(tab);
    } else {
      setInternalSubTab(tab);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedProduction, setSelectedProduction] = useState<any | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<any | null>(null);
  const [selectedTaskToEdit, setSelectedTaskToEdit] = useState<any | null>(null);
  
  const [workflowActionType, setWorkflowActionType] = useState<string | null>(null);
  const [activeWorkflowProd, setActiveWorkflowProd] = useState<any | null>(null);
  
  const handleOpenAssignEditor = (prod: any) => {
    setActiveWorkflowProd(prod);
    setWorkflowActionType('assign_editor');
  };

  

  
  
  
  
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [imagePreview, setImagePreview] = useState<{ url: string; title: string } | null>(null);

  // Compute KPI Stats
  const stats = useMemo(() => {
    const totalProjects = orders.length || production.length;
    let inProgressCount = 0;
    let editorAssignedCount = 0;
    let completedCount = 0;
    let pendingReviewCount = 0;

    (production || []).forEach(p => {
      const st = (p.editing_status || p.production_status || '').toLowerCase();
      if (st.includes('progress') || st.includes('editing')) inProgressCount++;
      if (st.includes('editor')) editorAssignedCount++;
      if (st.includes('review')) pendingReviewCount++;
      if (st.includes('completed') || st.includes('closed') || st.includes('approved')) completedCount++;
    });

    return {
      totalProjects,
      inProgressCount,
      editorAssignedCount,
      completedCount,
      pendingReviewCount
    };
  }, [orders, production]);

  const handleRefresh = async () => {
    if (!refreshData) return;
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateStatus = async (productionId: string, newStatus: string) => {
    try {
      await pushUpdate('production', 'production_id', productionId, {
        editing_status: newStatus,
        production_status: newStatus,
        updated_at: new Date().toISOString()
      });

      await logActivity({
        log_id: `log_${Date.now()}`,
        user_name: currentUserName || 'Production Lead',
        role: 'Production Staff',
        action: `Updated Production Status to ${newStatus}`,
        module: 'Production',
        record_id: productionId,
        timestamp: new Date().toISOString()
      });

      if (refreshData) refreshData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const openAssignEditor = (order: any, productionItem?: any, taskToEdit?: any) => {
    setSelectedOrder(order);
    setSelectedProduction(productionItem || null);
    setSelectedTaskToEdit(taskToEdit || null);
    setIsAssignEditorOpen(true);
  };

  const openAssignOps = (order: any, operationItem?: any) => {
    setSelectedOrder(order);
    setSelectedOperation(operationItem || null);
    setIsAssignOpsOpen(true);
  };

  const openReassign = (assignment: any) => {
    setSelectedAssignmentForReassign(assignment);
    setIsReassignOpen(true);
  };

  const openUploadProof = (assignment: any) => {
    setSelectedAssignmentForProof(assignment);
    setIsProofUploadOpen(true);
  };

  const openProjectDetails = (order: any, productionItem?: any) => {
    setSelectedOrder(order);
    setSelectedProduction(productionItem || null);
    setIsDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Production Header Bar */}
      <ProductionHeader
        stats={stats}
        activeSubTab={activeSubTab}
        setActiveSubTab={handleSubTabChange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Dynamic Subtab Content */}
      {['overview', 'tasks'].includes(activeSubTab) && (
        <ProductionTaskTable
          activeSubTab={activeSubTab}
          orders={orders}
          productionList={production}
          editorAssignments={editorAssignments}
          operationsList={operations}
          productionStaff={productionStaff}
          rawFootage={rawFootage}
          logs={logs}
          payments={payments}
          leadsData={leads}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onSelectProject={openProjectDetails}
          setWorkflowActionType={setWorkflowActionType}
          setActiveWorkflowProd={setActiveWorkflowProd}
          onAssignOps={openAssignOps}
          onReassignStaff={openReassign}
          onUploadProof={openUploadProof}
          onUpdateStatus={handleUpdateStatus}
          onPreviewImage={setImagePreview}
        />
      )}

      {activeSubTab === 'staff_directory' && (
        <ProductionStaffDirectory searchTerm={searchTerm} />
      )}

      {activeSubTab === 'staff_performance' && (
        <ProductionWorkloadAnalytics />
      )}

      {/* MODALS */}
      

      

      

      

      <ProductionDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        order={selectedOrder}
        productionItem={selectedProduction}
        onAssignEditor={(taskToEdit) => {
          setIsDetailsModalOpen(false);
          openAssignEditor(selectedOrder, selectedProduction, taskToEdit);
        }}
        onAssignOps={() => {
          setIsDetailsModalOpen(false);
          openAssignOps(selectedOrder, selectedOperation);
        }}
        onUploadProof={(task) => {
          setIsDetailsModalOpen(false);
          openUploadProof(task);
        }}
        onPreviewImage={setImagePreview}
      />

      {/* Global Image Preview Lightbox */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[260] flex items-center justify-center p-4 animate-in fade-in duration-200 font-mono">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-3xl w-full p-4 relative space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
              <span className="text-xs font-bold text-white truncate">{imagePreview.title}</span>
              <button
                type="button"
                onClick={() => setImagePreview(null)}
                className="p-1 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-zinc-900/40 rounded-xl p-2">
              <img
                src={imagePreview.url}
                alt={imagePreview.title}
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
