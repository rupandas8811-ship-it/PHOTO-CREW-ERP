import React, { useEffect, useState } from 'react';
import { useRole } from '../RoleContext';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '../../supabaseClient';

export const ProductionClientAcceptanceManager: React.FC = () => {
  const { production, pushUpdate, refreshData } = useRole();
  const productionRef = React.useRef(production);
  useEffect(() => {
    productionRef.current = production;
  }, [production]);

  const [activeProdId, setActiveProdId] = useState<string | null>(null);
  
  const activeProd = activeProdId 
    ? production?.find(p => p.production_id === activeProdId || p.tracking_id === activeProdId) 
    : null;
  
  // Checklist State
  const [checklist, setChecklist] = useState({
    checklist_customer_acceptance: false,
    checklist_content_usage: false,
    checklist_footage_deleted_7_days: false,
    checklist_payment_from_sales: false,
    checklist_edited_files_uploaded: false,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string[]>([]);
  
  // Reset state when a new prod is opened
  useEffect(() => {
    if (activeProd) {
      const statusNorm = (activeProd.current_status || activeProd.production_status || activeProd.editing_status || '').trim().toLowerCase();
      const completedStatuses = ['client acceptance', 'business owner review', 'project completed', 'completed', 'order closed', 'closed', 'final approval', 'approved', 'ready for delivery', 'delivered'];
      const isCompleted = completedStatuses.includes(statusNorm);

      setChecklist({
        checklist_customer_acceptance: isCompleted ? !!activeProd.checklist_customer_acceptance : false,
        checklist_content_usage: !!activeProd.checklist_content_usage,
        checklist_footage_deleted_7_days: !!activeProd.checklist_footage_deleted_7_days,
        checklist_payment_from_sales: !!activeProd.checklist_payment_from_sales,
        checklist_edited_files_uploaded: !!activeProd.checklist_edited_files_uploaded,
      });
      setErrorMsg([]);
      setIsSaving(false);
      setIsSuccess(false);
    }
  }, [activeProd, activeProdId]);

  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      const id = e.detail?.id;
      if (id) {
        setActiveProdId(id);
      }
    };
    window.addEventListener('OPEN_CLIENT_APPROVAL', handleOpenEvent);
    return () => window.removeEventListener('OPEN_CLIENT_APPROVAL', handleOpenEvent);
  }, []);

  useEffect(() => {
    const handleRemoveClientAcceptance = () => {
      // 1. Remove the "Client Acceptance" button from the action dropdowns
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
      
      for (const btn of buttons) {
        const text = (btn.textContent || '').trim().toLowerCase();
        
        // Target the specific dropdown button that opens the old deck
        if (text.includes('client acceptance')) {
          // Verify it's the dropdown button (contains the specific class or icon)
          if (btn.classList.contains('text-emerald-300') || btn.querySelector('span')?.textContent?.includes('✓')) {
            btn.style.setProperty('display', 'none', 'important');
            
            // Inject new Client Approval button next to it if not exists
            const parent = btn.parentElement;
            if (parent && !parent.querySelector('.custom-client-approval-btn')) {
              const approvalBtn = document.createElement('button');
              approvalBtn.className = 'custom-client-approval-btn w-full text-left px-2.5 py-2 text-[11px] font-semibold text-emerald-300 hover:text-white hover:bg-emerald-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer mt-1';
              approvalBtn.innerHTML = '<span class="text-sm">✓</span> <span>Client Approval</span>';
              
              approvalBtn.onclick = (e) => {
                e.stopPropagation();
                
                // Get ID from dropdown header
                const dropdown = btn.closest('.fixed.z-\\[10000\\]');
                let foundId = '';
                if (dropdown) {
                  const idSpan = dropdown.querySelector('span.text-zinc-500.font-mono');
                  if (idSpan) {
                    const idText = idSpan.textContent || '';
                    const match = idText.match(/ID:\s*(.+)/i);
                    if (match) {
                      foundId = match[1].trim();
                    }
                  }
                }
                
                // Hide dropdown
                if (dropdown) {
                  (dropdown as HTMLElement).style.display = 'none';
                }
                
                // Dispatch custom event to open popup
                window.dispatchEvent(new CustomEvent('OPEN_CLIENT_APPROVAL', { detail: { id: foundId } }));
              };
              
              parent.insertBefore(approvalBtn, btn.nextSibling);
            }
          }
        }
      }

      // 2. Hide the entire modal if it manages to open
      const allModals = Array.from(document.querySelectorAll<HTMLElement>('div.fixed.inset-0'));
      const caModal = allModals.find(m => {
        const text = (m.textContent || '').toLowerCase();
        return (
          text.includes('client acceptance verification deck') ||
          (text.includes('client acceptance') && text.includes('approve client acceptance'))
        );
      });

      if (caModal) {
        // Force hide the modal
        caModal.style.setProperty('display', 'none', 'important');
        
        // Find and click the Cancel/Close button to clear React state
        const cancelButton = Array.from(caModal.querySelectorAll<HTMLButtonElement>('button')).find(btn => {
          const t = (btn.textContent || '').toLowerCase();
          return t.includes('close') || t.includes('cancel') || t.includes('✕');
        });
        
        if (cancelButton) {
          cancelButton.click();
        }
      }
    };

    const interval = setInterval(handleRemoveClientAcceptance, 50);
    handleRemoveClientAcceptance();

    return () => clearInterval(interval);
  }, []);

  const checklistItems = [
    { key: 'checklist_customer_acceptance', label: 'Client Approval' },
    { key: 'checklist_content_usage', label: 'Content Usage Confirmation' },
    { key: 'checklist_footage_deleted_7_days', label: 'Footage Deleted in 7 Days' },
    { key: 'checklist_payment_from_sales', label: 'Verify Payment from Sales' },
    { key: 'checklist_edited_files_uploaded', label: 'Validate Edited Files Uploaded' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProd) return;
    
    // Validate
    const missing: string[] = [];
    checklistItems.forEach(item => {
      if (!(checklist as any)[item.key]) {
        missing.push(item.label);
      }
    });
    
    if (missing.length > 0) {
      setErrorMsg([
        'CLIENT APPROVAL CANNOT BE COMPLETED',
        'Please complete:',
        ...missing.map(m => `✗ ${m}`)
      ]);
      return;
    }
    
    setIsSaving(true);
    setErrorMsg([]);
    
    try {
      // 1. Update checklist values and status
      await pushUpdate('production', 'production_id', activeProd.production_id, {
        ...checklist,
        current_status: 'Client Acceptance',
        production_status: 'Client Acceptance',
        editing_status: 'Client Acceptance',
        status: 'Client Acceptance'
      });
      
      // 2. Verify Database
      const { data: dbData, error: dbError } = await supabaseClient
        .from('production')
        .select('*')
        .eq('production_id', activeProd.production_id);

      if (dbError || !dbData || dbData.length === 0) {
        throw new Error(`Database record (${activeProd.production_id}) could not be retrieved. ${dbError?.message || ''}`);
      }
      
      const dbRow = dbData[0];
      if (String(dbRow.current_status || '').trim().toLowerCase() !== 'client acceptance' && 
          String(dbRow.production_status || '').trim().toLowerCase() !== 'client acceptance') {
        throw new Error(`The Production status was not saved as Client Acceptance.`);
      }
      
      // 3. Refresh Data
      if (refreshData) {
        await refreshData();
      }
      
      // 4. Success - Close popup
      setIsSuccess(true);
      setTimeout(() => {
        setActiveProdId(null);
        setIsSuccess(false);
      }, 1000);
      
    } catch (err: any) {
      console.error('Client Approval Save Failed:', err);
      setErrorMsg([
        'CLIENT APPROVAL SAVE FAILED',
        'The database did not confirm the Client Acceptance update.',
        err?.message || String(err)
      ]);
      setIsSaving(false);
    }
  };

  if (!activeProdId || !activeProd) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[10000] flex items-center justify-center p-4 sm:p-6" onClick={() => setActiveProdId(null)}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-zinc-900/80 bg-zinc-950/50 sticky top-0 z-10 flex items-center justify-between">
           <div>
             <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider font-mono">
               <span className="text-emerald-400">✓</span> Client Approval
             </h3>
             <p className="text-[10px] text-zinc-500 mt-1 font-mono uppercase">
               PROJECT ID: <span className="text-violet-400 font-bold">{activeProd.production_id}</span>
             </p>
           </div>
           <button
             type="button"
             onClick={() => setActiveProdId(null)}
             className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer border border-zinc-800/80"
             title="Close Modal"
           >
             <span className="text-base font-bold leading-none">✕</span>
           </button>
        </div>
        
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
           {errorMsg.length > 0 && (
             <div className="p-4 bg-rose-950/95 border-2 border-rose-500/80 rounded-xl text-rose-100 shadow-2xl animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center gap-2 font-mono font-bold text-xs sm:text-sm text-rose-200 uppercase tracking-wider mb-2 border-b border-rose-800/80 pb-2">
                 <span className="text-rose-400 text-base">⚠</span> {errorMsg[0]}
               </div>
               <div className="text-xs font-sans text-rose-200/90 leading-relaxed space-y-1 pl-1">
                 {errorMsg.slice(1).map((msg, idx) => (
                   <p key={idx} className={msg.startsWith('✗') ? 'text-rose-300 font-mono text-[11px] ml-2' : 'font-semibold text-rose-100 mt-2 mb-1'}>
                     {msg}
                   </p>
                 ))}
               </div>
             </div>
           )}

           <form id="client-approval-form" onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-3">
               {checklistItems.map((item) => (
                 <label key={item.key} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800/50 hover:border-zinc-700 bg-zinc-900/30 cursor-pointer transition-colors group">
                   <input
                     type="checkbox"
                     checked={(checklist as any)[item.key]}
                     onChange={(e) => setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                     className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 transition-colors cursor-pointer"
                   />
                   <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                     {item.label}
                   </span>
                 </label>
               ))}
             </div>
           </form>
        </div>
        
        <div className="px-5 py-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/80 flex items-center gap-3">
           <button
             type="button"
             onClick={() => setActiveProdId(null)}
             className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer border border-zinc-800"
           >
             Cancel
           </button>
           <button
             type="submit"
             form="client-approval-form"
             disabled={isSaving || isSuccess}
             className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
           >
             {isSaving ? (
               <><span className="animate-spin inline-block mr-1">⟳</span> SAVING CLIENT APPROVAL...</>
             ) : isSuccess ? (
               <><span>✓</span> CLIENT APPROVED</>
             ) : (
               <><span>✓</span> CLIENT APPROVED</>
             )}
           </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
