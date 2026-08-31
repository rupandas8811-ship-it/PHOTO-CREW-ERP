import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from '../RoleContext';

/**
 * ProductionClientAcceptanceManager.tsx
 * 
 * PRODUCTION DASHBOARD — CLIENT ACCEPTANCE VERIFICATION DECK MANAGER
 * 
 * SCOPE & SPECIFICATIONS:
 * 1. REMOVE FINAL EDITED FOOTAGE LINK FROM UI & VALIDATION:
 *    - Removed Final Edited Footage Link label, input, state, and validation from UI.
 *    - Database column `public.production.final_edited_footage_link` and existing stored data remain untouched.
 * 2. REAL REACT STATE FOR FOLDER NAME & UPLOAD CONFIRMATIONS:
 *    - Renders Folder Name and Edited Folder Uploaded to Server using standard React state and createPortal.
 * 3. UPDATE & VERIFY PRODUCTION STATUS:
 *    - Updates `current_status = 'Client Acceptance'` and `production_status = 'Client Acceptance'` on `public.production`.
 *    - Verifies Supabase update by re-fetching the exact `production_id` before closing the modal.
 * 4. ERROR HANDLING & POPUP PERSISTENCE:
 *    - Front-level error banner displays if validation fails or database update/verification fails.
 *    - Keeps popup open on error.
 * 5. ZERO MODIFICATIONS TO ProductionModule.tsx (Strict file constraint).
 */

// Helper to extract clientAcceptanceProd directly from React Fiber
const getClientAcceptanceProdFromFiber = (caModal: HTMLElement): any => {
  if (!caModal) return null;
  const key = Object.keys(caModal).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
  if (!key) return null;
  let fiber = (caModal as any)[key];
  while (fiber) {
    const props = fiber.memoizedProps || fiber.pendingProps;
    if (props?.clientAcceptanceProd) {
      return props.clientAcceptanceProd;
    }
    fiber = fiber.return;
  }
  return null;
};

// Front-level error banner helpers
const showFrontLevelError = (containerEl: HTMLElement, title: string, items: string[]) => {
  let errorBox = containerEl.querySelector<HTMLElement>('.ca-front-error-banner');
  if (!errorBox) {
    errorBox = document.createElement('div');
    errorBox.className = 'ca-front-error-banner p-4 mb-4 bg-rose-950/95 border-2 border-rose-500 rounded-xl text-rose-100 space-y-2.5 shadow-2xl animate-in fade-in slide-in-from-top-2 z-50 transition-all';
    
    if (containerEl.firstChild) {
      containerEl.insertBefore(errorBox, containerEl.firstChild);
    } else {
      containerEl.appendChild(errorBox);
    }
  }

  const uniqueItems = Array.from(new Set(items));

  errorBox.innerHTML = `
    <div class="flex items-center justify-between border-b border-rose-800/80 pb-2">
      <div class="flex items-center gap-2 font-mono font-bold text-xs sm:text-sm text-rose-200 uppercase tracking-wider">
        <span class="text-rose-400 text-base">⚠</span> ${title}
      </div>
      <button type="button" class="ca-dismiss-error-btn px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-700/80 transition-colors cursor-pointer">
        Dismiss ✕
      </button>
    </div>
    <div class="text-xs font-sans text-rose-200/90 leading-relaxed mt-2">
      ${uniqueItems.length > 0 ? `
        <p class="font-semibold text-rose-100 mb-1">Missing:</p>
        <ul class="space-y-1 font-mono text-[12px] text-rose-200 pl-1">
          ${uniqueItems.map(item => `<li>• ${item}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;

  const dismissBtn = errorBox.querySelector<HTMLButtonElement>('.ca-dismiss-error-btn');
  if (dismissBtn) {
    dismissBtn.onclick = () => {
      errorBox?.remove();
    };
  }

  errorBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const clearFrontLevelError = (containerEl: HTMLElement) => {
  const errorBox = containerEl.querySelector<HTMLElement>('.ca-front-error-banner');
  if (errorBox) {
    errorBox.remove();
  }
};

export const ProductionClientAcceptanceManager: React.FC = () => {
  const {
    production,
    orders,
    leads,
    editorAssignments,
    saveClientAcceptanceVerification,
    updateEditorAssignmentStatus,
    updateProduction,
    updateOrderStage,
    pushUpdate,
    refreshData
  } = useRole();

  // Controlled React states for Client Acceptance Verification Deck
  const [folderNames, setFolderNames] = useState<Record<string, string>>({});
  const [uploadConfirmations, setUploadConfirmations] = useState<Record<string, boolean>>({});
  const [portalTargetMap, setPortalTargetMap] = useState<Record<string, HTMLElement>>({});

  // Synchronized refs to prevent stale closure in submit listener
  const foldersRef = useRef<Record<string, string>>({});
  const confirmationsRef = useRef<Record<string, boolean>>({});

  useEffect(() => { foldersRef.current = folderNames; }, [folderNames]);
  useEffect(() => { confirmationsRef.current = uploadConfirmations; }, [uploadConfirmations]);

  const activeExactProdIdRef = useRef<string>('');
  const lastModalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleSyncClientAcceptanceModal = () => {
      // Find modal containing "Client Acceptance Verification Deck"
      const allModals = Array.from(document.querySelectorAll<HTMLElement>('div.fixed.inset-0'));
      const caModal = allModals.find(m => {
        const text = (m.textContent || '').toLowerCase();
        return (
          text.includes('client acceptance verification deck') ||
          (text.includes('client acceptance') && text.includes('approve client acceptance'))
        );
      });

      if (!caModal) {
        if (activeExactProdIdRef.current) {
          activeExactProdIdRef.current = '';
          lastModalRef.current = null;
          setPortalTargetMap({});
        }
        return;
      }

      // Identify exact production record from fiber or header element
      const fiberProd = getClientAcceptanceProdFromFiber(caModal);
      const headerTitle = caModal.querySelector('h3');
      const headerText = headerTitle?.textContent || caModal.textContent || '';
      
      const prodIdMatches = Array.from(headerText.matchAll(/PRD-[A-Za-z0-9_-]+/gi)).map(m => m[0]);
      const matchedHeaderProdId = prodIdMatches[0] || fiberProd?.production_id || '';

      const exactTargetProd = fiberProd || (production || []).find(p =>
        p.production_id === matchedHeaderProdId ||
        (matchedHeaderProdId && p.production_id?.toLowerCase() === matchedHeaderProdId.toLowerCase())
      ) || (production || []).find(p => p.production_id && headerText.includes(p.production_id));

      const exactProdId = exactTargetProd?.production_id || matchedHeaderProdId;
      if (!exactProdId) return;

      // Reset or load initial values on opening new record deck
      if (lastModalRef.current !== caModal || activeExactProdIdRef.current !== exactProdId) {
        lastModalRef.current = caModal;
        activeExactProdIdRef.current = exactProdId;

        const savedFolderName = exactTargetProd?.folder_name || exactTargetProd?.server_upload_folder_name || (exactTargetProd as any)?.server_path || '';
        const isFolderUploadSaved = Boolean(
          savedFolderName ||
          exactTargetProd?.checklist_edited_files_uploaded ||
          exactTargetProd?.server_upload_confirmed ||
          exactTargetProd?.server_upload_validated ||
          exactTargetProd?.editing_status === 'Client Acceptance' ||
          (exactTargetProd as any)?.production_status === 'Client Acceptance'
        );

        // Pre-populate state for exact production
        const initialKey = exactProdId;
        setFolderNames({ [initialKey]: savedFolderName });
        setUploadConfirmations({ [initialKey]: isFolderUploadSaved });
      }

      // Hide default Event Date inputs in DOM if present
      const dateLabels = Array.from(caModal.querySelectorAll<HTMLElement>('label')).filter(l => (l.textContent || '').toLowerCase().includes('event date'));
      dateLabels.forEach(dateLabel => {
        const formGroup = dateLabel.closest('div.space-y-1, div:has(> label)') as HTMLElement | null;
        if (formGroup) {
          formGroup.style.setProperty('display', 'none', 'important');
          const dateInput = formGroup.querySelector('input');
          if (dateInput) {
            dateInput.required = false;
            dateInput.removeAttribute('required');
          }
        }
      });

      // Find event cards or confirmation blocks in modal
      const allLabels = Array.from(caModal.querySelectorAll<HTMLElement>('label'));
      const uploadCheckboxes = allLabels.filter(l => {
        const t = (l.textContent || '').toLowerCase();
        return t.includes('edited folder uploaded to server') || t.includes('edited folder uploaded in server');
      });

      const newPortalTargets: Record<string, HTMLElement> = {};

      uploadCheckboxes.forEach((uploadLabel, idx) => {
        const eventCard = uploadLabel.closest('div.p-3, div.rounded-xl, div.space-y-3') as HTMLElement | null || caModal;
        const cardTitleEl = eventCard.querySelector('span.font-bold, span.font-semibold');
        const cardKey = cardTitleEl?.textContent?.trim() || exactProdId || `card_${idx}`;

        // Ensure portal mount container exists inside the event card
        let mountNode = eventCard.querySelector<HTMLElement>('.ca-portal-mount-container');
        if (!mountNode) {
          // Hide original card children to replace with Portal component
          Array.from(eventCard.children).forEach((child: Element) => {
            (child as HTMLElement).style.setProperty('display', 'none', 'important');
          });

          mountNode = document.createElement('div');
          mountNode.className = 'ca-portal-mount-container w-full';
          eventCard.appendChild(mountNode);
        }

        newPortalTargets[cardKey] = mountNode;

        // Initialize state for card if not yet set
        const savedFolderName = exactTargetProd?.folder_name || exactTargetProd?.server_upload_folder_name || (exactTargetProd as any)?.server_path || '';
        const isFolderUploadSaved = Boolean(
          savedFolderName ||
          exactTargetProd?.checklist_edited_files_uploaded ||
          exactTargetProd?.server_upload_confirmed ||
          exactTargetProd?.server_upload_validated
        );

        if (foldersRef.current[cardKey] === undefined) {
          setFolderNames(prev => ({ ...prev, [cardKey]: savedFolderName }));
        }
        if (confirmationsRef.current[cardKey] === undefined) {
          setUploadConfirmations(prev => ({ ...prev, [cardKey]: isFolderUploadSaved }));
        }
      });

      setPortalTargetMap(newPortalTargets);

      // INTERCEPT FORM SUBMISSION
      const form = caModal.querySelector('form');
      if (form && !form.dataset.caEnhanced) {
        form.dataset.caEnhanced = 'true';

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const targetProdId = activeExactProdIdRef.current || exactProdId;
          const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
          const originalBtnText = submitBtn ? submitBtn.innerHTML : '';

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="animate-spin inline-block mr-1.5">⟳</span> SAVING CLIENT ACCEPTANCE...';
          }

          try {
            clearFrontLevelError(form);

            const missingItems: string[] = [];

            // 1. Validate Client Communication & Consent Proof
            const proofLabel = allLabels.find(l => (l.textContent || '').toLowerCase().includes('client communication & consent proof'));
            const proofCheckbox = proofLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]') || proofLabel?.closest('label')?.querySelector<HTMLInputElement>('input[type="checkbox"]');
            const isConsentChecked = proofCheckbox ? proofCheckbox.checked : false;

            if (!isConsentChecked) {
              missingItems.push('Client Communication & Consent Proof');
            }

            const proofImg = caModal.querySelector<HTMLImageElement>('img[alt*="Proof"], img[alt*="Communication"]');
            const proofLink = caModal.querySelector<HTMLAnchorElement>('a[href*="storage"], a[href*="firebasestorage"], a[href*="proof"], a[href*="http"]');
            const proofNameSpan = caModal.querySelector<HTMLElement>('span.truncate');
            const proofNameInput = caModal.querySelector<HTMLInputElement>('input[placeholder*="Upload Name"], input[name*="uploadName"]');

            let caCommunicationProofVal = (proofImg?.src || proofLink?.href || exactTargetProd?.client_communication_proof || '').trim();
            let caUploadNameVal = (proofNameInput?.value || proofNameSpan?.textContent || exactTargetProd?.upload_name || 'Verified Consent Proof').trim();

            if (!caCommunicationProofVal && isConsentChecked) {
              caCommunicationProofVal = caUploadNameVal;
            }

            if (!caCommunicationProofVal) {
              missingItems.push('Client Communication & Consent Proof');
            }

            // 2. Validate Edited Folder Upload & Folder Name
            let folderVal = '';
            let isFolderCheckedOverall = false;
            let isAnyFolderEmpty = false;

            const cardEntries = Object.keys(confirmationsRef.current).length > 0
              ? Object.keys(confirmationsRef.current)
              : [exactProdId];

            cardEntries.forEach(cardKey => {
              const isChecked = Boolean(confirmationsRef.current[cardKey]);
              const cardFolder = (foldersRef.current[cardKey] || '').trim();
              
              if (isChecked) {
                isFolderCheckedOverall = true;
                if (!folderVal && cardFolder) folderVal = cardFolder;
              }

              if (!cardFolder) {
                isAnyFolderEmpty = true;
              }
            });

            if (!isFolderCheckedOverall) {
              missingItems.push('Edited Folder Uploaded to Server');
            }
            
            if (isAnyFolderEmpty && !missingItems.includes('Folder Name')) {
              missingItems.push('Folder Name');
            }

            // STOP IF MISSING ANY REQUIRED ITEM
            if (missingItems.length > 0) {
              showFrontLevelError(form, 'CLIENT ACCEPTANCE CANNOT BE APPROVED', missingItems);
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
              }
              return;
            }

            // Additional Checkboxes
            const custAccLabel = allLabels.find(l => (l.textContent || '').toLowerCase().includes('customer acceptance'));
            const custAccCb = custAccLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]');
            const caVerifyCustomerAcceptance = custAccCb ? custAccCb.checked : Boolean(exactTargetProd?.checklist_customer_acceptance);

            const contentUsageLabel = allLabels.find(l => (l.textContent || '').toLowerCase().includes('content usage'));
            const contentUsageCb = contentUsageLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]');
            const caContentUsageConfirmation = contentUsageCb ? contentUsageCb.checked : Boolean(exactTargetProd?.checklist_content_usage);

            const footageDelLabel = allLabels.find(l => (l.textContent || '').toLowerCase().includes('deleted after 7 days') || (l.textContent || '').toLowerCase().includes('footage deleted'));
            const footageDelCb = footageDelLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]');
            const caFootageDeleted7Days = footageDelCb ? footageDelCb.checked : Boolean(exactTargetProd?.checklist_footage_deleted_7_days);

            const paymentSalesLabel = allLabels.find(l => (l.textContent || '').toLowerCase().includes('payment from sales'));
            const paymentSalesCb = paymentSalesLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]');
            const caVerifyPaymentSales = paymentSalesCb ? paymentSalesCb.checked : Boolean(exactTargetProd?.checklist_payment_from_sales);

            const clientApprovalDate = new Date().toISOString();

            // PREPARE DATABASE PAYLOAD FOR public.production RECORD
            const prodPayload = {
              checklist_client_communication_proof: true,
              client_communication_proof: caCommunicationProofVal,
              customer_communication_proof: caCommunicationProofVal,
              proof_url: caCommunicationProofVal,
              upload_name: caUploadNameVal,
              proof_name: caUploadNameVal,
              client_communication_proof_name: caUploadNameVal,

              checklist_edited_files_uploaded: true,
              server_upload_confirmed: true,
              server_upload_validated: true,
              folder_name: folderVal,
              server_upload_folder_name: folderVal,

              checklist_customer_acceptance: caVerifyCustomerAcceptance,
              checklist_content_usage: caContentUsageConfirmation,
              checklist_footage_deleted_7_days: caFootageDeleted7Days,
              checklist_payment_from_sales: caVerifyPaymentSales,

              client_approval_date: clientApprovalDate,

              current_status: 'Client Acceptance',
              production_status: 'Client Acceptance',
              editing_status: 'Client Acceptance',
              status: 'Client Acceptance',
              remarks: `Client Acceptance Approved on ${new Date().toLocaleString()}. Folder: ${folderVal}`
            };

            // 1. SAVE TO public.production FOR EXACT production_id ONLY
            const resProd = await pushUpdate('production', 'production_id', targetProdId, prodPayload);
            if (resProd?.error) {
              throw new Error(`Database save error (${targetProdId}): ${resProd.error}`);
            }

            if (updateProduction) {
              try {
                await updateProduction(targetProdId, prodPayload);
              } catch (uErr: any) {
                console.warn('[updateProduction state update warning]:', uErr);
              }
            }

            // 2. PERSIST VERIFICATION RECORD IF HOOK AVAILABLE
            const orderId = exactTargetProd?.order_id || exactTargetProd?.tracking_id || targetProdId;
            if (saveClientAcceptanceVerification) {
              try {
                await saveClientAcceptanceVerification({
                  order_id: orderId,
                  event_id: 'default',
                  folder_name: folderVal,
                  client_communication_consent_proof: caCommunicationProofVal,
                  proof_file_name: caUploadNameVal,
                  consent_proof_verified: true,
                  edited_folder_uploaded_to_server: true
                } as any);
              } catch (vErr) {
                console.warn('[saveClientAcceptanceVerification warning]:', vErr);
              }
            }

            // 3. UPDATE RELATED EDITOR ASSIGNMENTS METADATA (DO NOT CHANGE ASSIGNMENT STATUS TO PRESERVE HISTORY)
            const matchingAssignments = (editorAssignments || []).filter(a =>
              a.production_id === targetProdId || (orderId && a.order_id === orderId)
            );
            for (const a of matchingAssignments) {
              try {
                await pushUpdate('editor_assignments', 'assignment_id', a.assignment_id, {
                  server_upload_folder_name: folderVal,
                  folder_name: folderVal,
                  server_upload_confirmed: true,
                  edited_folder_uploaded_to_server: true
                });
              } catch (_) {}
            }

            // 4. UPDATE RELATED ORDER/LEAD STAGE TO 'Client Acceptance'
            if (orderId) {
              if (updateOrderStage) {
                try {
                  await updateOrderStage(orderId, 'Client Acceptance' as any);
                } catch (_) {}
              }
              await pushUpdate('orders', 'order_id', orderId, {
                current_stage: 'Client Acceptance',
                status: 'Client Acceptance'
              });
              await pushUpdate('leads', 'lead_id', orderId, {
                status: 'Client Acceptance'
              });
            }

            // 5. RE-FETCH AND VERIFY DATABASE VALUES FROM public.production
            const verifyRes = await fetch('/api/db/select', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                table: 'production',
                matchColumn: 'production_id',
                matchValue: targetProdId
              })
            });
            const verifyData = await verifyRes.json();
            if (!verifyData?.success || !Array.isArray(verifyData.data) || verifyData.data.length === 0) {
              throw new Error(`CLIENT ACCEPTANCE STATUS UPDATE FAILED: Database record (${targetProdId}) could not be retrieved.`);
            }

            const dbRow = verifyData.data[0];

            if (String(dbRow.current_status || '').trim().toLowerCase() !== 'client acceptance' && String(dbRow.production_status || '').trim().toLowerCase() !== 'client acceptance' && String(dbRow.editing_status || '').trim().toLowerCase() !== 'client acceptance') {
              throw new Error(`CLIENT ACCEPTANCE STATUS UPDATE FAILED: The Production status was not saved as Client Acceptance. Current DB values: current_status='${dbRow.current_status || ''}', production_status='${dbRow.production_status || ''}', editing_status='${dbRow.editing_status || ''}'.`);
            }

            // 6. REFRESH GLOBAL DATA
            if (refreshData) {
              await refreshData();
            }

            // 7. SUCCESS — CLOSE POPUP CLEANLY
            if (submitBtn) {
              submitBtn.innerHTML = '✓ CLIENT ACCEPTANCE APPROVED';
              submitBtn.classList.remove('bg-amber-600', 'hover:bg-amber-500');
              submitBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500', 'text-white');
            }

            setTimeout(() => {
              const cancelButton = Array.from(caModal.querySelectorAll<HTMLButtonElement>('button')).find(btn => {
                const t = (btn.textContent || '').toLowerCase();
                return t.includes('close') || t.includes('cancel') || t.includes('✕');
              });
              if (cancelButton) {
                cancelButton.click();
              }
            }, 750);

          } catch (saveErr: any) {
            console.error('[ProductionClientAcceptanceManager] Failed to finalize Client Acceptance:', saveErr);
            const errText = saveErr?.message || String(saveErr);
            
            if (errText.includes('STATUS UPDATE FAILED')) {
              showFrontLevelError(form, 'CLIENT ACCEPTANCE STATUS UPDATE FAILED', [
                'The Production status was not saved as Client Acceptance.',
                errText.replace('CLIENT ACCEPTANCE STATUS UPDATE FAILED: ', '')
              ]);
            } else {
              showFrontLevelError(form, 'CLIENT ACCEPTANCE SAVE FAILED', [
                errText
              ]);
            }
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnText;
            }
          }
        }, true);
      }
    };

    const interval = setInterval(handleSyncClientAcceptanceModal, 150);
    handleSyncClientAcceptanceModal();

    return () => clearInterval(interval);
  }, [
    production,
    orders,
    leads,
    editorAssignments,
    saveClientAcceptanceVerification,
    updateEditorAssignmentStatus,
    updateProduction,
    updateOrderStage,
    pushUpdate,
    refreshData
  ]);

  // Render Portal for each active event card
  return (
    <>
      {Object.entries(portalTargetMap).map(([cardKey, mountNode]) => {
        if (!mountNode || !(mountNode instanceof HTMLElement) || !document.body.contains(mountNode as Node)) return null;

        const isConfirmed = Boolean(uploadConfirmations[cardKey]);
        const folderVal = folderNames[cardKey] || '';

        return createPortal(
          <div key={`portal_content_${cardKey}`} className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => {
                  const nextVal = e.target.checked;
                  setUploadConfirmations(prev => ({ ...prev, [cardKey]: nextVal }));
                }}
                className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 transition-colors cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 transition-colors block">
                  Edited Folder Uploaded to Server
                </span>
                <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                  Confirm upload for: <span className="font-bold text-zinc-400">{cardKey.startsWith('card_') || cardKey.startsWith('PRD-') ? 'Event' : cardKey}</span>
                </span>
              </div>
            </label>

            {isConfirmed && (
              <div className="pl-7 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono">
                  FOLDER NAME <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={isConfirmed}
                  placeholder="e.g. 2024-05-12_Wedding_Videos"
                  value={folderVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFolderNames(prev => ({ ...prev, [cardKey]: val }));
                  }}
                  className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-mono transition-all outline-none"
                />
              </div>
            )}
          </div>,
          mountNode
        );
      })}
    </>
  );
};
