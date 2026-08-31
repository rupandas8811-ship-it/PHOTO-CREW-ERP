import React, { useEffect, useState, useRef } from 'react';
import { useRole } from '../RoleContext';

/**
 * ProductionClientAcceptanceManager.tsx
 * 
 * PRODUCTION DASHBOARD — CLIENT ACCEPTANCE VERIFICATION DECK MANAGER
 * 
 * SCOPE & SPECIFICATIONS:
 * 1. USE THE ACTUAL public.production RECORD:
 *    - Identifies exact current production_id (no search by customer name or array index).
 *    - Updates ONLY the exact Production record currently open.
 * 2. SAVE ALL CLIENT ACCEPTANCE VALUES:
 *    - Saves: checklist_client_communication_proof, client_communication_proof,
 *      checklist_edited_files_uploaded, folder_name, final_edited_footage_link,
 *      checklist_customer_acceptance, checklist_content_usage, checklist_footage_deleted_7_days,
 *      checklist_payment_from_sales, client_approval_date.
 * 3. SAVE PRODUCTION STATUS:
 *    - Sets current_status = 'Client Acceptance' AND production_status = 'Client Acceptance'.
 *    - Final status stored in database, treating current_status/production_status as authoritative.
 * 4. PREVENT "EDITING COMPLETED" OVERWRITE:
 *    - Ensures Client Acceptance priority over lower workflow stages.
 * 5. SAVE FIRST, STATUS SECOND:
 *    - Sequence: Click Approve -> Show Loading -> Validate -> Save -> Check DB -> Update Status -> Verify -> Refresh -> Success -> Close.
 * 6. LOADING STATE:
 *    - Button changes to "⟳ SAVING CLIENT ACCEPTANCE..." and is disabled until done.
 * 7. ERROR BANNERS & VERIFICATION:
 *    - Shows front-level error banner if validation or database save/verification fails.
 *    - Modal remains open on error.
 * 8. ZERO MODIFICATIONS TO ProductionModule.tsx (Strict file constraint).
 */

// Helper to set input value programmatically and dispatch both input & change events for React state compatibility
const setTextInputValue = (inputEl: HTMLInputElement, value: string) => {
  if (inputEl.value === value) return;
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  const prototype = Object.getPrototypeOf(inputEl);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter?.call(inputEl, value);
  } else {
    valueSetter?.call(inputEl, value);
  }
  inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  inputEl.dispatchEvent(new Event("change", { bubbles: true }));
};

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
    <div class="text-xs font-sans text-rose-200/90 leading-relaxed">
      ${uniqueItems.length > 0 ? `
        <p class="font-semibold text-rose-100 mb-1">Missing / Required:</p>
        <ul class="list-disc list-inside space-y-1 font-mono text-[11px] text-rose-200 pl-1">
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

  const activeExactProdIdRef = useRef<string>('');
  const lastModalRef = useRef<HTMLElement | null>(null);
  const typedLinksRef = useRef<Record<string, string>>({});

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
        activeExactProdIdRef.current = '';
        lastModalRef.current = null;
        typedLinksRef.current = {};
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

      if (lastModalRef.current !== caModal || activeExactProdIdRef.current !== exactProdId) {
        lastModalRef.current = caModal;
        activeExactProdIdRef.current = exactProdId;
        typedLinksRef.current = {};
      }

      // Hide event date inputs if present (target only actual date inputs inside event date labels)
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

      // Fetch saved values from exactTargetProd
      const savedFolderName = exactTargetProd?.folder_name || exactTargetProd?.server_upload_folder_name || (exactTargetProd as any)?.server_path || '';
      const savedLink = exactTargetProd?.final_edited_footage_link || exactTargetProd?.edited_drive_link || (exactTargetProd as any)?.final_consolidated_drive_link || '';
      const savedUploadName = exactTargetProd?.upload_name || exactTargetProd?.proof_name || exactTargetProd?.client_communication_proof_name || '';

      // AUTOFILL 1: CLIENT COMMUNICATION & CONSENT PROOF
      const allLabels = Array.from(caModal.querySelectorAll<HTMLElement>('label'));
      const proofLabel = allLabels.find(l => (l.textContent || '').toLowerCase().includes('client communication & consent proof'));
      const proofCheckbox = proofLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]') || proofLabel?.closest('label')?.querySelector<HTMLInputElement>('input[type="checkbox"]');
      
      if (exactTargetProd?.checklist_client_communication_proof && proofCheckbox && !proofCheckbox.checked) {
        proofCheckbox.click();
      }

      const proofNameInput = caModal.querySelector<HTMLInputElement>('input[placeholder*="Upload Name"], input[name*="uploadName"]');
      if (proofNameInput && !proofNameInput.value && savedUploadName) {
        setTextInputValue(proofNameInput, savedUploadName);
      }

      // AUTOFILL 2: EDITED FOLDER UPLOADED TO SERVER CHECKBOX & INPUTS
      const uploadCheckboxes = allLabels.filter(l => {
        const t = (l.textContent || '').toLowerCase();
        return t.includes('edited folder uploaded to server') || t.includes('edited folder uploaded in server');
      });

      uploadCheckboxes.forEach((uploadLabel, idx) => {
        const eventCard = uploadLabel.closest('div.p-3, div.rounded-xl, div.space-y-3') as HTMLElement | null || caModal;
        
        // Extract card isolation key
        const cardTitleEl = eventCard.querySelector('span.font-bold, span.font-semibold');
        const cardKey = cardTitleEl?.textContent?.trim() || `card_${idx}`;

        const isFolderUploadSaved = Boolean(
          savedFolderName ||
          savedLink ||
          exactTargetProd?.checklist_edited_files_uploaded ||
          exactTargetProd?.server_upload_confirmed ||
          exactTargetProd?.server_upload_validated ||
          exactTargetProd?.editing_status === 'Client Acceptance' ||
          (exactTargetProd as any)?.production_status === 'Client Acceptance'
        );

        const checkbox = eventCard.querySelector<HTMLInputElement>('input[type="checkbox"]');
        if (isFolderUploadSaved && checkbox && !checkbox.checked) {
          checkbox.click();
        }

        // Hide Event Date container specifically inside this card
        const cardDateLabel = Array.from(eventCard.querySelectorAll<HTMLElement>('label')).find(l => (l.textContent || '').toLowerCase().includes('event date'));
        if (cardDateLabel) {
          const dateGroup = cardDateLabel.closest('div.space-y-1') as HTMLElement | null;
          if (dateGroup) {
            dateGroup.style.setProperty('display', 'none', 'important');
            const dInput = dateGroup.querySelector('input');
            if (dInput) {
              dInput.required = false;
              dInput.removeAttribute('required');
            }
          }
        }

        const folderInput = eventCard.querySelector<HTMLInputElement>('input[placeholder*="Wedding_Videos"], input[placeholder*="folder name"], input[id*="folder"]');
        if (folderInput && savedFolderName && !folderInput.value && document.activeElement !== folderInput) {
          setTextInputValue(folderInput, savedFolderName);
        }

        // Inject / Ensure FINAL EDITED FOOTAGE LINK * field
        const gridContainer = eventCard.querySelector('div.grid') as HTMLElement | null || eventCard;
        if (gridContainer) {
          let linkWrapper = gridContainer.querySelector<HTMLElement>('.ca-final-footage-link-group');
          const currentLinkValue = typedLinksRef.current[cardKey] ?? savedLink ?? '';

          if (!linkWrapper) {
            linkWrapper = document.createElement('div');
            linkWrapper.className = 'space-y-1 ca-final-footage-link-group';
            linkWrapper.innerHTML = `
              <label class="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono">
                FINAL EDITED FOOTAGE LINK <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Paste final edited footage URL (e.g. Google Drive link)"
                value="${currentLinkValue.replace(/"/g, '&quot;')}"
                class="ca-final-footage-link-input w-full bg-zinc-950 text-zinc-100 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-mono transition-all outline-none"
              />
            `;
            gridContainer.appendChild(linkWrapper);
          }

          const linkInput = linkWrapper.querySelector<HTMLInputElement>('input.ca-final-footage-link-input');
          if (linkInput) {
            if (document.activeElement !== linkInput) {
              if (currentLinkValue && linkInput.value !== currentLinkValue) {
                linkInput.value = currentLinkValue;
              }
            }
            typedLinksRef.current[cardKey] = linkInput.value;

            if (!linkInput.dataset.bound) {
              linkInput.dataset.bound = 'true';
              const handleInput = (e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                typedLinksRef.current[cardKey] = val;
              };
              linkInput.addEventListener('input', handleInput);
              linkInput.addEventListener('change', handleInput);
            }
          }
        }
      });

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
            const pLabel = allLabels.find(l => (l.textContent || '').toLowerCase().includes('client communication & consent proof'));
            const pCheckbox = pLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]') || pLabel?.closest('label')?.querySelector<HTMLInputElement>('input[type="checkbox"]');
            const isConsentChecked = pCheckbox ? pCheckbox.checked : false;

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
              missingItems.push('Client Communication & Consent Proof File');
            }

            // 2. Validate Edited Folder Uploaded to Server
            const folderCheckboxes = allLabels.filter(l => {
              const t = (l.textContent || '').toLowerCase();
              return t.includes('edited folder uploaded to server') || t.includes('edited folder uploaded in server');
            });

            let folderVal = '';
            let linkVal = '';
            let isFolderCheckedOverall = false;

            folderCheckboxes.forEach((uploadLabel, idx) => {
              const eventCard = uploadLabel.closest('div.p-3, div.rounded-xl, div.space-y-3') as HTMLElement | null || caModal;
              const cardTitleEl = eventCard.querySelector('span.font-bold, span.font-semibold');
              const cardKey = cardTitleEl?.textContent?.trim() || `card_${idx}`;

              const folderCb = uploadLabel.querySelector<HTMLInputElement>('input[type="checkbox"]') || uploadLabel.closest('label')?.querySelector<HTMLInputElement>('input[type="checkbox"]');
              const isFolderChecked = folderCb ? folderCb.checked : false;

              if (isFolderChecked) {
                isFolderCheckedOverall = true;
                const folderInput = eventCard.querySelector<HTMLInputElement>('input[placeholder*="Wedding_Videos"], input[placeholder*="folder name"], input[id*="folder"]') || caModal.querySelector<HTMLInputElement>('input[placeholder*="Wedding_Videos"], input[placeholder*="folder name"], input[id*="folder"]');
                const linkInput = eventCard.querySelector<HTMLInputElement>('input.ca-final-footage-link-input') || caModal.querySelector<HTMLInputElement>('input.ca-final-footage-link-input');

                const cardFolderVal = folderInput ? (folderInput.value || '').trim() : '';
                const cardLinkVal = linkInput ? (linkInput.value || '').trim() : (typedLinksRef.current[cardKey] || '').trim();

                if (!cardFolderVal && !missingItems.includes('Folder Name')) {
                  missingItems.push('Folder Name');
                }
                if (!cardLinkVal && !missingItems.includes('Final Edited Footage Link')) {
                  missingItems.push('Final Edited Footage Link');
                }

                if (!folderVal && cardFolderVal) folderVal = cardFolderVal;
                if (!linkVal && cardLinkVal) linkVal = cardLinkVal;
              }
            });

            if (!isFolderCheckedOverall && folderCheckboxes.length > 0) {
              missingItems.push('Edited Folder Uploaded to Server');
            }

            if (!folderVal) {
              const fallbackFolderInput = caModal.querySelector<HTMLInputElement>('input[placeholder*="Wedding_Videos"], input[placeholder*="folder name"], input[id*="folder"]');
              folderVal = (fallbackFolderInput?.value || savedFolderName || '').trim();
            }

            if (!linkVal) {
              const fallbackLinkInput = caModal.querySelector<HTMLInputElement>('input.ca-final-footage-link-input');
              linkVal = (fallbackLinkInput?.value || Object.values(typedLinksRef.current)[0] || savedLink || '').trim();
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

            // Read state of additional checkboxes to preserve actual values
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

            // PREPARE DATABASE PAYLOAD FOR public.production RECORD ONLY
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
              final_edited_footage_link: linkVal,
              edited_drive_link: linkVal,
              final_consolidated_drive_link: linkVal,
              upload_link_path: linkVal,

              checklist_customer_acceptance: caVerifyCustomerAcceptance,
              checklist_content_usage: caContentUsageConfirmation,
              checklist_footage_deleted_7_days: caFootageDeleted7Days,
              checklist_payment_from_sales: caVerifyPaymentSales,

              client_approval_date: clientApprovalDate,

              // Authoritative Status Updates
              current_status: 'Client Acceptance',
              production_status: 'Client Acceptance',
              editing_status: 'Client Acceptance',
              status: 'Client Acceptance',
              remarks: `Client Acceptance Approved on ${new Date().toLocaleString()}. Folder: ${folderVal}, Link: ${linkVal}`
            };

            // 1. SAVE TO public.production FOR EXACT production_id ONLY
            const resProd = await pushUpdate('production', 'production_id', targetProdId, prodPayload);
            if (!resProd?.success && resProd?.error) {
              throw new Error(`Supabase error saving production record (${targetProdId}): ${resProd.error}`);
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
                  upload_link_path: linkVal,
                  final_edited_footage_link: linkVal,
                  client_communication_consent_proof: caCommunicationProofVal,
                  proof_file_name: caUploadNameVal,
                  consent_proof_verified: true,
                  edited_folder_uploaded_to_server: true
                } as any);
              } catch (vErr) {
                console.warn('[saveClientAcceptanceVerification warning]:', vErr);
              }
            }

            // 3. UPDATE RELATED EDITOR ASSIGNMENTS STATUS TO 'Client Acceptance'
            const matchingAssignments = (editorAssignments || []).filter(a =>
              a.production_id === targetProdId || (orderId && a.order_id === orderId)
            );
            for (const a of matchingAssignments) {
              try {
                await pushUpdate('editor_assignments', 'assignment_id', a.assignment_id, {
                  status: 'Client Acceptance',
                  edited_drive_link: linkVal,
                  final_edited_footage_link: linkVal,
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
              throw new Error(`CLIENT ACCEPTANCE VERIFICATION FAILED: Database record (${targetProdId}) could not be retrieved.`);
            }

            const dbRow = verifyData.data[0];

            if (dbRow.current_status !== 'Client Acceptance' && dbRow.production_status !== 'Client Acceptance') {
              throw new Error(`CLIENT ACCEPTANCE VERIFICATION FAILED: current_status in database was '${dbRow.current_status || 'null'}' and production_status was '${dbRow.production_status || 'null'}' instead of 'Client Acceptance'.`);
            }

            if (!dbRow.checklist_client_communication_proof && !dbRow.client_communication_proof) {
              throw new Error(`CLIENT ACCEPTANCE VERIFICATION FAILED: Client communication proof was not saved in database.`);
            }

            if (!dbRow.checklist_edited_files_uploaded) {
              throw new Error(`CLIENT ACCEPTANCE VERIFICATION FAILED: checklist_edited_files_uploaded was not saved as true.`);
            }

            if (folderVal && dbRow.folder_name !== folderVal && dbRow.server_upload_folder_name !== folderVal) {
              throw new Error(`CLIENT ACCEPTANCE VERIFICATION FAILED: folder_name in database ('${dbRow.folder_name || 'null'}') did not match submitted '${folderVal}'.`);
            }

            if (linkVal && dbRow.final_edited_footage_link !== linkVal && dbRow.edited_drive_link !== linkVal) {
              throw new Error(`CLIENT ACCEPTANCE VERIFICATION FAILED: final_edited_footage_link in database did not match submitted link.`);
            }

            // 6. REFRESH GLOBAL DATA
            if (refreshData) {
              await refreshData();
            }

            // 7. SUCCESS — CLOSE POPUP CLEANLY
            const cancelButton = Array.from(caModal.querySelectorAll<HTMLButtonElement>('button')).find(btn => {
              const t = (btn.textContent || '').toLowerCase();
              return t.includes('close') || t.includes('cancel') || t.includes('✕');
            });
            if (cancelButton) {
              cancelButton.click();
            }

          } catch (saveErr: any) {
            console.error('[ProductionClientAcceptanceManager] Failed to finalize Client Acceptance:', saveErr);
            showFrontLevelError(form, 'CLIENT ACCEPTANCE SAVE FAILED', [
              `Error: ${saveErr?.message || String(saveErr)}`,
              `Please ensure the database connection is active and retry.`
            ]);
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

  return null;
};
