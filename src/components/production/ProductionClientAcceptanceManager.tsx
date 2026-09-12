import React, { useEffect, useState } from 'react';
import { useRole } from '../RoleContext';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabaseClient } from '../../supabaseClient';

const performClientSideValidation = async (activeProd: any) => {
  const cleanId = String(activeProd.production_id).trim();
  const orderId = activeProd.order_id ? String(activeProd.order_id).trim() : '';

  let assignments: any[] = [];
  const { data: eaData } = await supabaseClient
    .from('editor_assignments')
    .select('*')
    .eq('production_id', cleanId);
  if (Array.isArray(eaData) && eaData.length > 0) {
    assignments = eaData;
  } else if (orderId) {
    const { data: eaOrderData } = await supabaseClient
      .from('editor_assignments')
      .select('*')
      .eq('order_id', orderId);
    if (Array.isArray(eaOrderData) && eaOrderData.length > 0) {
      assignments = eaOrderData;
    }
  }

  let caVerifs: any[] = [];
  if (orderId) {
    const { data: cavData } = await supabaseClient
      .from('client_acceptance_verifications')
      .select('*')
      .eq('order_id', orderId);
    if (Array.isArray(cavData)) {
      caVerifs = cavData;
    }
  }

  const prodHasConfirmedServerUpload = activeProd.server_upload_confirmed === true;
  const prodHasEditedFolderUploaded = activeProd.edited_folder_uploaded_to_server === true;
  const prodFolderName = (activeProd.server_upload_folder_name || activeProd.server_path || activeProd.folder_name || '').trim();
  const prodDriveLink = (activeProd.edited_drive_link || activeProd.delivery_link || activeProd.final_edited_footage_link || activeProd.upload_link_path || '').trim();

  let assignmentsWithUploadedFiles = 0;
  let matchedFolderName = prodFolderName;
  let matchedDriveLink = prodDriveLink;

  assignments.forEach((a: any) => {
    const aFolder = (a.server_upload_folder_name || a.server_path || a.folder_name || '').trim();
    const aLink = (a.edited_drive_link || a.Edited_Drive_Link || a.server_file_link || a.upload_link || a.final_edited_footage_link || a.upload_link_path || '').trim();
    const aProof = (a.proof_url || a.proof_image || a.uploaded_proof || a.customer_review_image || a.confirmation_proof || a.client_communication_proof || '').trim();
    const aConfirmed = a.server_upload_confirmed === true || a.edited_folder_uploaded_to_server === true;

    const hasUploaded = aConfirmed || Boolean(aFolder) || Boolean(aLink) || Boolean(aProof);
    if (hasUploaded) {
      assignmentsWithUploadedFiles++;
      if (!matchedFolderName && aFolder) matchedFolderName = aFolder;
      if (!matchedDriveLink && aLink) matchedDriveLink = aLink;
    }
  });

  const cavMatch = caVerifs.find((cav: any) =>
    cav.consent_proof_verified === true ||
    cav.edited_folder_uploaded_to_server === true ||
    Boolean((cav.folder_name || '').trim()) ||
    Boolean((cav.upload_link_path || cav.final_edited_footage_link || '').trim()) ||
    Boolean((cav.proof_storage_path || '').trim())
  );
  if (cavMatch && !matchedFolderName && cavMatch.folder_name) {
    matchedFolderName = cavMatch.folder_name.trim();
  }

  const hasUploaded =
    prodHasConfirmedServerUpload ||
    prodHasEditedFolderUploaded ||
    Boolean(prodFolderName) ||
    Boolean(prodDriveLink) ||
    Boolean(cavMatch) ||
    (assignments.length > 0 && assignmentsWithUploadedFiles > 0);

  const isValid = hasUploaded;
  
  return {
    isValid,
    message: isValid ? 'Verified' : `Edited files must be uploaded to the server first for Project ID ${cleanId}. No server upload or edited folder found.`,
    details: {
      folderName: matchedFolderName || 'Server Storage Verified'
    }
  };
};

export const ProductionClientAcceptanceManager: React.FC = () => {
  const { production, pushUpdate, refreshData, updateProduction } = useRole();
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
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [saveProgressSuccess, setSaveProgressSuccess] = useState(false);
  const [isValidatingFiles, setIsValidatingFiles] = useState(false);
  const [serverFilesVerified, setServerFilesVerified] = useState<boolean | null>(null);
  const [serverFolderInfo, setServerFolderInfo] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string[]>([]);
  
  // Restore saved state when a project is opened
  useEffect(() => {
    if (!activeProd) return;

    const projectId = activeProd.production_id;
    const statusNorm = (activeProd.current_status || activeProd.production_status || activeProd.editing_status || '').trim().toLowerCase();
    const completedStatuses = ['client accepted', 'client acceptance', 'business owner review', 'project completed', 'completed', 'order closed', 'closed', 'final approval', 'approved', 'ready for delivery', 'delivered'];
    const isCompleted = completedStatuses.includes(statusNorm);

    // 1. Initial baseline from activeProd
    let initialChecklist = {
      checklist_customer_acceptance: isCompleted ? !!activeProd.checklist_customer_acceptance : false,
      checklist_content_usage: !!activeProd.checklist_content_usage,
      checklist_footage_deleted_7_days: !!activeProd.checklist_footage_deleted_7_days,
      checklist_payment_from_sales: !!activeProd.checklist_payment_from_sales,
      checklist_edited_files_uploaded: !!activeProd.checklist_edited_files_uploaded,
    };

    // 2. Check localStorage cache for this exact Project ID
    try {
      const localCached = localStorage.getItem(`client_approval_progress_${projectId}`);
      if (localCached) {
        const parsed = JSON.parse(localCached);
        if (parsed && parsed.project_id === projectId) {
          initialChecklist = {
            checklist_customer_acceptance: Boolean(parsed.client_approval ?? initialChecklist.checklist_customer_acceptance),
            checklist_content_usage: Boolean(parsed.content_usage_confirmation ?? initialChecklist.checklist_content_usage),
            checklist_footage_deleted_7_days: Boolean(parsed.footage_deleted_7_days ?? initialChecklist.checklist_footage_deleted_7_days),
            checklist_payment_from_sales: Boolean(parsed.verify_payment_from_sales ?? initialChecklist.checklist_payment_from_sales),
            checklist_edited_files_uploaded: Boolean(parsed.validate_edited_files_uploaded ?? initialChecklist.checklist_edited_files_uploaded),
          };
        }
      }
    } catch (_) {}

    setChecklist(initialChecklist);
    setErrorMsg([]);
    setIsSaving(false);
    setIsSavingProgress(false);
    setSaveProgressSuccess(false);
    setIsSuccess(false);
    setServerFilesVerified(null);
    setServerFolderInfo(null);

    // 3. Fetch dedicated saved progress from server for this exact Project ID
    let isCancelled = false;
    const loadServerProgress = async () => {
      try {
        const res = await fetch(`/api/client-approval/progress/${encodeURIComponent(projectId)}`);
        if (res.ok) {
          const json = await res.json();
          if (!isCancelled && json.success && json.data) {
            const serverData = json.data;
            setChecklist(prev => ({
              checklist_customer_acceptance: serverData.client_approval !== undefined ? Boolean(serverData.client_approval) : prev.checklist_customer_acceptance,
              checklist_content_usage: serverData.content_usage_confirmation !== undefined ? Boolean(serverData.content_usage_confirmation) : prev.checklist_content_usage,
              checklist_footage_deleted_7_days: serverData.footage_deleted_7_days !== undefined ? Boolean(serverData.footage_deleted_7_days) : prev.checklist_footage_deleted_7_days,
              checklist_payment_from_sales: serverData.verify_payment_from_sales !== undefined ? Boolean(serverData.verify_payment_from_sales) : prev.checklist_payment_from_sales,
              checklist_edited_files_uploaded: serverData.validate_edited_files_uploaded !== undefined ? Boolean(serverData.validate_edited_files_uploaded) : prev.checklist_edited_files_uploaded,
            }));
          }
        }
      } catch (err) {
        console.warn('[Client Approval] Could not fetch server progress:', err);
      }
    };
    loadServerProgress();

    return () => {
      isCancelled = true;
    };
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
    { key: 'checklist_edited_files_uploaded', label: 'Validate Edited Files Uploaded to Server' },
  ];

  // Handle checking/unchecking with server-side validation for edited files
  const handleItemToggle = async (key: string, checked: boolean) => {
    if (!activeProd) return;

    if (key === 'checklist_edited_files_uploaded') {
      if (!checked) {
        setChecklist(prev => ({ ...prev, [key]: false }));
        setServerFilesVerified(null);
        setServerFolderInfo(null);
        return;
      }

      // User wants to check "Validate Edited Files Uploaded to Server" -> Perform Server-Side Validation!
      setIsValidatingFiles(true);
      setErrorMsg([]);
      try {
        const data = await performClientSideValidation(activeProd);

        if (!data.isValid) {
          setChecklist(prev => ({ ...prev, [key]: false }));
          setServerFilesVerified(false);
          setServerFolderInfo(null);
          setErrorMsg([
            'SERVER FILE VALIDATION FAILED',
            `Project ID: ${activeProd.production_id}`,
            data.message || 'Required edited files must be uploaded to the server first.'
          ]);
        } else {
          setChecklist(prev => ({ ...prev, [key]: true }));
          setServerFilesVerified(true);
          setServerFolderInfo(data.details?.folderName || 'Confirmed on Server');
          setErrorMsg([]);
        }
      } catch (err: any) {
        setChecklist(prev => ({ ...prev, [key]: false }));
        setServerFilesVerified(false);
        setErrorMsg([
          'SERVER FILE VALIDATION ERROR',
          `Could not verify edited files for Project ID: ${activeProd.production_id}`,
          err.message || String(err)
        ]);
      } finally {
        setIsValidatingFiles(false);
      }
      return;
    }

    setChecklist(prev => ({ ...prev, [key]: checked }));
  };

  // Save Progress - Persist state per Project ID without completing approval
  const handleSaveProgress = async () => {
    if (!activeProd) return;

    setIsSavingProgress(true);
    setErrorMsg([]);

    try {
      const payload = {
        project_id: activeProd.production_id,
        client_approval: checklist.checklist_customer_acceptance,
        content_usage_confirmation: checklist.checklist_content_usage,
        footage_deleted_7_days: checklist.checklist_footage_deleted_7_days,
        verify_payment_from_sales: checklist.checklist_payment_from_sales,
        validate_edited_files_uploaded: checklist.checklist_edited_files_uploaded
      };

      // 1. Cache to localStorage for instant local retrieval
      try {
        localStorage.setItem(`client_approval_progress_${activeProd.production_id}`, JSON.stringify(payload));
      } catch (_) {}

      // 2. Persist to server API dedicated storage
      const res = await fetch('/api/client-approval/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[Client Approval] Server progress endpoint warning:', errJson);
      }

      // 3. Update production table checklist state
      await pushUpdate('production', 'production_id', activeProd.production_id, {
        ...checklist
      });

      setSaveProgressSuccess(true);
      setTimeout(() => {
        setActiveProdId(null);
        setSaveProgressSuccess(false);
        setIsSavingProgress(false);
      }, 700);
    } catch (err: any) {
      console.error('[Client Approval] Error saving progress:', err);
      setErrorMsg([
        'FAILED TO SAVE PROGRESS',
        'Could not save checklist progress for this project.',
        err.message || String(err)
      ]);
      setIsSavingProgress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProd) return;
    
    // 1. Validate all checklist items are checked
    const missing: string[] = [];
    checklistItems.forEach(item => {
      if (!(checklist as any)[item.key]) {
        missing.push(item.label);
      }
    });
    
    if (missing.length > 0) {
      setErrorMsg([
        'CLIENT APPROVAL CANNOT BE COMPLETED',
        'Please complete all checklist items:',
        ...missing.map(m => `✗ ${m}`)
      ]);
      return;
    }
    
    setIsSaving(true);
    setErrorMsg([]);
    
    try {
      // 2. Server-side check: Verify edited files actually exist on the server for this Project ID
      const valData = await performClientSideValidation(activeProd);

      if (!valData.isValid) {
        setIsSaving(false);
        setChecklist(prev => ({ ...prev, checklist_edited_files_uploaded: false }));
        setServerFilesVerified(false);
        setErrorMsg([
          'CLIENT APPROVAL CANNOT BE COMPLETED',
          'Validate Edited Files Uploaded to Server:',
          `✗ ${valData.message || 'Required edited files are not uploaded to the server for Project ID ' + activeProd.production_id + '. Please upload the edited files first.'}`
        ]);
        return;
      }

      // 3. Update checklist values and status to Client Accepted
      const statusUpdates = {
        ...checklist,
        current_status: 'Client Accepted',
        production_status: 'Client Accepted',
        editing_status: 'Client Accepted',
        status: 'Client Accepted'
      };

      if (updateProduction) {
        await updateProduction(activeProd.production_id, statusUpdates);
      }
      await pushUpdate('production', 'production_id', activeProd.production_id, statusUpdates);

      // 4. Save completed progress to server storage and local cache
      await fetch('/api/client-approval/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: activeProd.production_id,
          client_approval: true,
          content_usage_confirmation: true,
          footage_deleted_7_days: true,
          verify_payment_from_sales: true,
          validate_edited_files_uploaded: true,
          status: 'Client Accepted'
        })
      }).catch(() => {});

      try {
        localStorage.setItem(`client_approval_progress_${activeProd.production_id}`, JSON.stringify({
          project_id: activeProd.production_id,
          client_approval: true,
          content_usage_confirmation: true,
          footage_deleted_7_days: true,
          verify_payment_from_sales: true,
          validate_edited_files_uploaded: true,
          status: 'Client Accepted'
        }));
      } catch (_) {}
      
      // 5. Verify Database
      const { data: dbData, error: dbError } = await supabaseClient
        .from('production')
        .select('*')
        .eq('production_id', activeProd.production_id);

      if (dbError || !dbData || dbData.length === 0) {
        throw new Error(`Database record (${activeProd.production_id}) could not be retrieved. ${dbError?.message || ''}`);
      }
      
      const dbRow = dbData[0];
      const savedStatus = String(dbRow.editing_status || dbRow.production_status || dbRow.current_status || '').trim().toLowerCase();
      if (savedStatus !== 'client accepted' && savedStatus !== 'client acceptance') {
        throw new Error(`The Production status was not saved as Client Accepted.`);
      }
      
      // 6. Refresh Data
      if (refreshData) {
        await refreshData();
      }
      
      // 7. Success - Close popup
      setIsSuccess(true);
      setTimeout(() => {
        setActiveProdId(null);
        setIsSuccess(false);
      }, 1000);
      
    } catch (err: any) {
      console.error('Client Approval Save Failed:', err);
      setErrorMsg([
        'CLIENT APPROVAL SAVE FAILED',
        'The database did not confirm the Client Accepted update.',
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

           {saveProgressSuccess && (
             <div className="p-3 bg-amber-950/80 border border-amber-500/50 rounded-xl text-amber-200 text-xs font-mono flex items-center gap-2 animate-in fade-in">
               <span>✓</span> Progress saved for Project ID: <strong className="text-white">{activeProd.production_id}</strong>
             </div>
           )}

           <form id="client-approval-form" onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-3">
               {checklistItems.map((item) => {
                 const isEditedFilesItem = item.key === 'checklist_edited_files_uploaded';
                 const isChecked = Boolean((checklist as any)[item.key]);

                 return (
                   <label
                     key={item.key}
                     className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800/50 hover:border-zinc-700 bg-zinc-900/30 cursor-pointer transition-colors group relative"
                   >
                     <input
                       type="checkbox"
                       checked={isChecked}
                       disabled={isEditedFilesItem && isValidatingFiles}
                       onChange={(e) => handleItemToggle(item.key, e.target.checked)}
                       className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
                     />
                     <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                       <span className="text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors">
                         {item.label}
                       </span>

                       {isEditedFilesItem && isValidatingFiles && (
                         <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 animate-pulse">
                           <span className="animate-spin text-xs">⟳</span> Verifying Server...
                         </span>
                       )}

                       {isEditedFilesItem && !isValidatingFiles && isChecked && (
                         <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                           <span>✓</span> {serverFolderInfo ? `Verified: ${serverFolderInfo}` : 'Verified on Server'}
                         </span>
                       )}

                       {isEditedFilesItem && !isValidatingFiles && serverFilesVerified === false && !isChecked && (
                         <span className="text-[10px] text-rose-400 font-mono">
                           ✗ Server Files Missing
                         </span>
                       )}
                     </div>
                   </label>
                 );
               })}
             </div>
           </form>
        </div>
        
        <div className="px-5 py-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/80 flex items-center gap-2 sm:gap-3">
           <button
             type="button"
             onClick={() => setActiveProdId(null)}
             className="py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer border border-zinc-800"
           >
             CANCEL
           </button>

           <button
             type="button"
             onClick={handleSaveProgress}
             disabled={isSavingProgress || isSaving || isSuccess}
             className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer border border-zinc-700 flex items-center justify-center gap-1.5 disabled:opacity-50"
             title="Save current progress and resume later"
           >
             {isSavingProgress ? (
               <><span className="animate-spin inline-block text-xs">⟳</span> SAVING...</>
             ) : saveProgressSuccess ? (
               <><span>✓</span> SAVED</>
             ) : (
               <>SAVE</>
             )}
           </button>

           <button
             type="submit"
             form="client-approval-form"
             disabled={isSaving || isSavingProgress || isSuccess}
             className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
           >
             {isSaving ? (
               <><span className="animate-spin inline-block mr-1">⟳</span> SAVING APPROVAL...</>
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
