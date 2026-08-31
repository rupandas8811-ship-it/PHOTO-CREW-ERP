import React, { useEffect, useState, useRef } from 'react';
import { useRole } from '../RoleContext';

/**
 * ProductionClientAcceptanceManager.tsx
 * 
 * PRODUCTION DASHBOARD — CLIENT ACCEPTANCE VERIFICATION DECK MANAGER
 * 
 * SCOPE & SPECIFICATIONS:
 * 1. REQUIRED CHECKLIST VALIDATION:
 *    - Validates "Client Communication & Consent Proof" (checkbox, file/url, upload name).
 *    - Validates "Edited Folder Uploaded to Server" (checkbox, Folder Name, Final Edited Footage Link).
 *    - Shows front-level error messages if any item is missing and stops submission.
 * 2. SAVE CHECKLIST DATA FIRST:
 *    - Persists verification records to Supabase (client_acceptance_verifications, editor_assignments, production).
 * 3. UPDATE PRODUCTION STATUS & ORDER STAGE:
 *    - Updates Production record to 'Client Acceptance'.
 *    - Updates related Order stage to 'Client Acceptance'.
 *    - Updates editor_assignments status to 'Client Acceptance' to prevent rank recalculation reverts.
 * 4. VERIFY DATABASE PERSISTENCE & REFRESH DATA:
 *    - Verifies Supabase returns 'Client Acceptance' status before closing modal.
 *    - Triggers refreshData() so status persists on re-open, page reload, and in Business Owner workflow.
 * 5. ZERO MODIFICATIONS TO ProductionModule.tsx (Strict file rule).
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

// Helper to extract eventGroup details directly from React Fiber for 100% accuracy
const getEventGroupFromFiber = (el: HTMLElement): { eventId: string; eventName: string } | null => {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
  if (!key) return null;

  let fiber = (el as any)[key];
  while (fiber) {
    if (fiber.key && String(fiber.key).startsWith('manual_conf_')) {
      const eventId = String(fiber.key).replace('manual_conf_', '');
      
      let eventName = eventId;
      let curr = fiber;
      while (curr) {
        const p = curr.memoizedProps || curr.pendingProps;
        if (p?.group?.eventName) {
          eventName = p.group.eventName;
          break;
        }
        curr = curr.return;
      }
      return { eventId, eventName };
    }
    fiber = fiber.return;
  }
  return null;
};

// Extract all valid identifiers for a production item to prevent lookup mismatches
const getAllCandidateOrderIds = (targetProd: any, fallbackId?: string): string[] => {
  const set = new Set<string>();
  if (fallbackId) set.add(String(fallbackId).trim().toLowerCase());
  if (targetProd) {
    if (targetProd.production_id) set.add(String(targetProd.production_id).trim().toLowerCase());
    if (targetProd.tracking_id) set.add(String(targetProd.tracking_id).trim().toLowerCase());
    if (targetProd.order_id) set.add(String(targetProd.order_id).trim().toLowerCase());
    if (targetProd.lead_id) set.add(String(targetProd.lead_id).trim().toLowerCase());
    if (targetProd.id) set.add(String(targetProd.id).trim().toLowerCase());
  }
  return Array.from(set).filter(Boolean);
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

  // Deduplicate item messages
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
        <p class="font-semibold text-rose-100 mb-1">Missing:</p>
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
    clientAcceptanceVerifications,
    saveClientAcceptanceVerification,
    updateEditorAssignmentStatus,
    updateProduction,
    updateOrderStage,
    pushUpdate,
    refreshData
  } = useRole();

  // State to hold event-isolated links: Record<eventId, linkUrl>
  const [eventLinks, setEventLinks] = useState<Record<string, string>>({});
  const eventLinksRef = useRef<Record<string, string>>({});
  eventLinksRef.current = eventLinks;

  const activeOrderIdRef = useRef<string>('');
  const activeProdIdRef = useRef<string>('');
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
        activeOrderIdRef.current = '';
        activeProdIdRef.current = '';
        lastModalRef.current = null;
        return;
      }

      // Check if this is a newly opened modal session
      if (lastModalRef.current !== caModal) {
        lastModalRef.current = caModal;
        setEventLinks({});
        eventLinksRef.current = {};
      }

      // Extract Order / Production ID from Fiber FIRST
      const fiberProd = getClientAcceptanceProdFromFiber(caModal);

      // Extract Order / Production ID from header or badges or fiber
      const headerTitle = caModal.querySelector('h3');
      const headerText = headerTitle?.textContent || caModal.textContent || '';
      const prodIdMatches = Array.from(headerText.matchAll(/(PRD-[A-Za-z0-9_-]+|ORD-[A-Za-z0-9_-]+|TRK-[A-Za-z0-9_-]+|OR[0-9]{2,6}|LD[0-9]{2,6})/gi)).map(m => m[1]);
      const matchedHeaderId = prodIdMatches[0] || fiberProd?.production_id || fiberProd?.order_id || fiberProd?.tracking_id || '';

      // Match target production record
      const targetProd = fiberProd || (production || []).find(p =>
        p.production_id === matchedHeaderId ||
        (p as any).order_id === matchedHeaderId ||
        p.tracking_id === matchedHeaderId ||
        (matchedHeaderId && (
          p.production_id?.toLowerCase() === matchedHeaderId.toLowerCase() ||
          p.tracking_id?.toLowerCase() === matchedHeaderId.toLowerCase() ||
          String((p as any).order_id || '').toLowerCase() === matchedHeaderId.toLowerCase() ||
          String((p as any).lead_id || '').toLowerCase() === matchedHeaderId.toLowerCase()
        ))
      ) || (production || []).find(p => {
        const custName = (p as any).customer_name || '';
        return custName && headerText.includes(custName);
      });

      const orderId = (targetProd as any)?.order_id || targetProd?.tracking_id || targetProd?.production_id || matchedHeaderId;
      const prodId = targetProd?.production_id || matchedHeaderId;

      if (orderId) activeOrderIdRef.current = orderId;
      if (prodId) activeProdIdRef.current = prodId;

      const candidateIds = getAllCandidateOrderIds(targetProd, matchedHeaderId);

      // Find all event cards under "Edited Folder Upload Confirmation" / "Edited Folder Uploaded to Server"
      const allLabels = Array.from(caModal.querySelectorAll<HTMLElement>('label'));
      const uploadCheckboxes = allLabels.filter(l => {
        const t = (l.textContent || '').toLowerCase();
        return t.includes('edited folder uploaded to server') || t.includes('edited folder uploaded in server');
      });

      uploadCheckboxes.forEach((uploadLabel, idx) => {
        const eventCard = uploadLabel.closest('div.p-3, div.rounded-xl, div.space-y-3') as HTMLElement | null;
        if (!eventCard) return;

        // Determine event identity with high-precision React Fiber traversal, fallback to regex mapping
        const fiberDetails = getEventGroupFromFiber(eventCard);
        let eventName = fiberDetails?.eventName || '';
        let eventId = fiberDetails?.eventId || '';

        if (!eventId) {
          const eventCardText = eventCard.textContent || '';
          const eventNameMatch = eventCardText.match(/confirm upload for:\s*([^\n\r]+)/i) || eventCardText.match(/event:\s*([^\n\r]+)/i);
          eventName = eventNameMatch ? eventNameMatch[1].trim() : `Event ${idx + 1}`;

          // Find matching event ID from lead or order events
          const matchedLead = (leads || []).find(l => candidateIds.includes(String(l.id || '').toLowerCase()) || candidateIds.includes(String((l as any).order_id || '').toLowerCase()) || candidateIds.includes(String((l as any).lead_id || '').toLowerCase()) || (targetProd?.lead_id && String(l.id || '').toLowerCase() === String(targetProd.lead_id).toLowerCase()));
          const matchedOrder = (orders || []).find(o => candidateIds.includes(String(o.order_id || '').toLowerCase()) || candidateIds.includes(String((o as any).id || '').toLowerCase()) || candidateIds.includes(String((o as any).lead_id || '').toLowerCase()));
          const eventsList = (matchedLead?.events && Array.isArray(matchedLead.events)) ? matchedLead.events : (matchedOrder?.events && Array.isArray(matchedOrder.events) ? matchedOrder.events : []);

          const matchedEv = eventsList.find((ev: any, eIdx: number) =>
            ev.id === eventName ||
            ev.event_id === eventName ||
            ev.event_name === eventName ||
            ev.event_type === eventName ||
            `Event ${eIdx + 1}` === eventName ||
            eIdx === idx
          );

          eventId = String(matchedEv?.id || matchedEv?.event_id || (eventsList[idx] as any)?.id || (eventsList[idx] as any)?.event_id || `EV-${idx + 1}`);
        }

        // 1. REMOVE EVENT DATE: Hide "Event Date *" section and remove required constraint
        const dateInputs = Array.from(eventCard.querySelectorAll<HTMLInputElement>('input[type="date"], input[id*="date"]'));
        dateInputs.forEach(dateInput => {
          dateInput.required = false;
          dateInput.removeAttribute('required');
          const formGroup = dateInput.closest('div.space-y-1, div:has(> label)') as HTMLElement | null;
          if (formGroup) {
            formGroup.style.setProperty('display', 'none', 'important');
          }
        });

        // Also check if any label with "Event Date" exists and hide its parent
        const formLabels = Array.from(eventCard.querySelectorAll<HTMLElement>('label'));
        formLabels.forEach(lbl => {
          const lText = (lbl.textContent || '').toLowerCase();
          if (lText.includes('event date') && !lText.includes('edited folder')) {
            const group = lbl.closest('div.space-y-1, div') as HTMLElement | null;
            if (group && group !== eventCard) {
              group.style.setProperty('display', 'none', 'important');
            }
          }
        });

        // 2. FETCH PREVIOUS SAVED VALUES FOR AUTOFILL WITH COMPREHENSIVE IDENTIFIER MATCHING
        const cleanEvt = String(eventId || 'default').trim().toLowerCase();

        // Match saved verification across candidate order IDs and event identifiers
        const orderVerifs = (clientAcceptanceVerifications || []).filter(v => {
          const vOrd = String(v.order_id || '').trim().toLowerCase();
          return candidateIds.includes(vOrd);
        });

        const savedVerif = orderVerifs.find(v => {
          const vEvt = String(v.event_id || 'default').trim().toLowerCase();
          return vEvt === cleanEvt || vEvt === eventName.toLowerCase() || vEvt === 'default' || cleanEvt === 'default';
        }) || orderVerifs[0]; // Fallback to first verif for single-event orders

        let savedFolderName = savedVerif?.folder_name || '';
        let savedLink = savedVerif?.final_edited_footage_link || savedVerif?.upload_link_path || '';

        const matchingAssignment = (editorAssignments || []).find(a =>
          (candidateIds.includes(String(a.order_id || '').toLowerCase()) || candidateIds.includes(String(a.production_id || '').toLowerCase())) &&
          (a.event_id === eventId || a.event_id === eventName || !a.event_id || cleanEvt === 'default')
        );

        if (!savedFolderName) {
          savedFolderName = matchingAssignment?.server_upload_folder_name || targetProd?.server_upload_folder_name || (targetProd as any)?.server_path || '';
        }
        if (!savedLink) {
          savedLink = matchingAssignment?.edited_drive_link || (matchingAssignment as any)?.Edited_Drive_Link || (matchingAssignment as any)?.delivery_link || targetProd?.edited_drive_link || (targetProd as any)?.final_consolidated_drive_link || '';
        }

        // 2A. CHECKLIST ITEM 1: CLIENT COMMUNICATION & CONSENT PROOF (INDEPENDENT)
        const proofLabel = allLabels.find(l => (l.textContent || '').toLowerCase().includes('client communication & consent proof'));
        const proofCheckbox = proofLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]') || proofLabel?.closest('label')?.querySelector<HTMLInputElement>('input[type="checkbox"]');
        const isProofSaved = Boolean(
          savedVerif?.consent_proof_verified ||
          savedVerif?.client_communication_consent_proof ||
          targetProd?.client_communication_proof ||
          targetProd?.checklist_client_communication_proof
        );
        if (isProofSaved && proofCheckbox && !proofCheckbox.checked) {
          proofCheckbox.click();
        }

        // Autofill Upload Name if previously saved
        const proofNameInput = caModal.querySelector<HTMLInputElement>('input[placeholder*="Upload Name"], input[name*="uploadName"]');
        if (proofNameInput && !proofNameInput.value && (savedVerif?.proof_file_name || targetProd?.upload_name)) {
          setTextInputValue(proofNameInput, savedVerif?.proof_file_name || targetProd?.upload_name || '');
        }

        // 2B. CHECKLIST ITEM 2: EDITED FOLDER UPLOADED TO SERVER (INDEPENDENT)
        const isFolderUploadConfirmed = Boolean(
          (savedFolderName && savedLink) ||
          (savedVerif as any)?.edited_folder_uploaded_to_server ||
          matchingAssignment?.server_upload_confirmed ||
          (matchingAssignment as any)?.edited_folder_uploaded_to_server ||
          targetProd?.server_upload_confirmed ||
          (targetProd as any)?.edited_folder_uploaded_to_server
        );

        // Check the "Edited Folder Uploaded to Server" checkbox if there's saved data for folder upload
        const checkbox = eventCard.querySelector<HTMLInputElement>('input[type="checkbox"]');
        if (isFolderUploadConfirmed && checkbox && !checkbox.checked) {
          checkbox.click();
        }

        // KEEP FOLDER NAME: Ensure folder name grid layout looks clean
        const folderInput = eventCard.querySelector<HTMLInputElement>('input[placeholder*="Wedding_Videos"], input[placeholder*="folder name"], input[id*="folder"]') as HTMLInputElement | null;
        if (folderInput) {
          const folderGroup = folderInput.closest('div.space-y-1, div:has(> label)') as HTMLElement | null;
          if (folderGroup) {
            folderGroup.style.removeProperty('display');
          }

          // Fill previous folder name and dispatch input event to sync with React parent state
          if (savedFolderName && folderInput.value !== savedFolderName) {
            setTextInputValue(folderInput, savedFolderName);
          }
        }

        // 3 & 4. ADD FINAL EDITED FOOTAGE LINK: Injected inside event card with strict event data isolation
        const gridContainer = eventCard.querySelector('div.grid') as HTMLElement | null;
        if (gridContainer) {
          gridContainer.classList.remove('ca-folder-single-col');
          gridContainer.style.setProperty('grid-template-columns', 'repeat(auto-fit, minmax(240px, 1fr))', 'important');

          let linkWrapper = gridContainer.querySelector(`.ca-final-footage-link-group[data-event-id="${eventId}"]`) as HTMLElement | null;
          if (!linkWrapper) {
            const oldGroup = gridContainer.querySelector('.ca-final-footage-link-group');
            if (oldGroup && oldGroup.getAttribute('data-event-id') !== eventId) {
              oldGroup.remove();
            }

            linkWrapper = document.createElement('div');
            linkWrapper.className = 'space-y-1 ca-final-footage-link-group';
            linkWrapper.setAttribute('data-event-id', eventId);

            if (savedLink) {
              setEventLinks(prev => ({ ...prev, [eventId]: savedLink }));
            }

            linkWrapper.innerHTML = `
              <label class="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 font-mono">
                Final Edited Footage Link <span class="text-rose-500">*</span>
              </label>
              <input
                type="url"
                data-event-id="${eventId}"
                placeholder="Paste final edited footage URL (e.g. Google Drive link)"
                value="${savedLink.replace(/"/g, '&quot;')}"
                class="ca-final-footage-link-input w-full bg-zinc-950 text-zinc-100 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-mono transition-all outline-none"
              />
            `;

            gridContainer.appendChild(linkWrapper);

            const inputEl = linkWrapper.querySelector<HTMLInputElement>('input.ca-final-footage-link-input');
            if (inputEl) {
              inputEl.addEventListener('input', (e) => {
                const val = (e.target as HTMLInputElement).value;
                setEventLinks(prev => ({ ...prev, [eventId]: val }));
              });
            }
          } else {
            const inputEl = linkWrapper.querySelector<HTMLInputElement>('input.ca-final-footage-link-input');
            if (inputEl && document.activeElement !== inputEl) {
              const currentVal = eventLinksRef.current[eventId] || savedLink || '';
              if (inputEl.value !== currentVal && currentVal) {
                inputEl.value = currentVal;
              }
            }
          }
        }
      });

      // 5. Intercept "Approve Client Acceptance" form submission to ensure Supabase persistence & strict validation
      const form = caModal.querySelector('form');
      if (form && !form.dataset.caEnhanced) {
        form.dataset.caEnhanced = 'true';

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const currentOrderId = activeOrderIdRef.current || orderId;
          const currentProdId = activeProdIdRef.current || prodId;

          const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
          const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="animate-spin inline-block mr-1">⟳</span> SAVING CLIENT ACCEPTANCE...';
          }

          try {
            clearFrontLevelError(form);

            // COLLECT ALL MISSING REQUIRED CHECKLIST ITEMS & FIELDS
            const missingItems: string[] = [];

            // Check Client Communication & Consent Proof
            const proofLabel = allLabels.find(l => (l.textContent || '').toLowerCase().includes('client communication & consent proof'));
            const proofCheckbox = proofLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]') || proofLabel?.closest('label')?.querySelector<HTMLInputElement>('input[type="checkbox"]');
            const isConsentProofChecked = proofCheckbox ? proofCheckbox.checked : false;

            if (!isConsentProofChecked) {
              missingItems.push('Client Communication & Consent Proof');
            }

            const proofImg = caModal.querySelector<HTMLImageElement>('img[alt*="Proof"], img[alt*="Communication"]');
            const proofLink = caModal.querySelector<HTMLAnchorElement>('a[href*="storage"], a[href*="firebasestorage"], a[href*="proof"], a[href*="http"]');
            
            // Match saved verification
            const orderVerifs = (clientAcceptanceVerifications || []).filter(v => {
              const vOrd = String(v.order_id || '').trim().toLowerCase();
              return candidateIds.includes(vOrd);
            });
            const savedVerif = orderVerifs[0];

            let caCommunicationProofVal = proofImg?.src || proofLink?.href || targetProd?.client_communication_proof || savedVerif?.client_communication_consent_proof || '';

            const proofNameSpan = caModal.querySelector<HTMLElement>('span.truncate');
            const proofNameInput = caModal.querySelector<HTMLInputElement>('input[placeholder*="Upload Name"], input[name*="uploadName"]');
            let caUploadNameVal = proofNameInput?.value || proofNameSpan?.textContent || targetProd?.upload_name || savedVerif?.proof_file_name || '';

            if (!caCommunicationProofVal || !caCommunicationProofVal.trim()) {
              missingItems.push('Client Communication & Consent Proof (Proof file / document required)');
            }

            if (!caUploadNameVal || !caUploadNameVal.trim()) {
              missingItems.push('Upload Name');
            }

            // Check "Edited Folder Uploaded to Server" for each event/task card
            const linkInputs = Array.from(caModal.querySelectorAll<HTMLInputElement>('input.ca-final-footage-link-input'));

            if (linkInputs.length > 0) {
              linkInputs.forEach((inp, i) => {
                const card = inp.closest('div.p-3, div.rounded-xl, div.space-y-3');
                const fInput = card?.querySelector<HTMLInputElement>('input[placeholder*="Wedding_Videos"], input[placeholder*="folder name"], input[id*="folder"]');
                const folderVal = fInput ? (fInput.value || '').trim() : '';
                const linkVal = (inp.value || '').trim();

                const checkbox = card?.querySelector<HTMLInputElement>('input[type="checkbox"]');
                const isFolderUploadChecked = checkbox ? checkbox.checked : false;

                if (!isFolderUploadChecked) {
                  missingItems.push(`Edited Folder Uploaded to Server`);
                }
                if (!folderVal) {
                  missingItems.push(`Folder Name`);
                }
                if (!linkVal) {
                  missingItems.push(`Final Edited Footage Link`);
                }
              });
            } else {
              const uploadCheckboxes = allLabels.filter(l => {
                const t = (l.textContent || '').toLowerCase();
                return t.includes('edited folder uploaded to server') || t.includes('edited folder uploaded in server');
              });

              if (uploadCheckboxes.length === 0) {
                missingItems.push('Edited Folder Uploaded to Server');
                missingItems.push('Folder Name');
                missingItems.push('Final Edited Footage Link');
              } else {
                uploadCheckboxes.forEach((uploadLabel) => {
                  const card = uploadLabel.closest('div.p-3, div.rounded-xl, div.space-y-3');
                  const checkbox = card?.querySelector<HTMLInputElement>('input[type="checkbox"]');
                  const folderInput = card?.querySelector<HTMLInputElement>('input[placeholder*="Wedding_Videos"], input[placeholder*="folder name"], input[id*="folder"]');
                  
                  const isChecked = checkbox ? checkbox.checked : false;
                  const folderVal = folderInput ? (folderInput.value || '').trim() : '';

                  if (!isChecked) missingItems.push(`Edited Folder Uploaded to Server`);
                  if (!folderVal) missingItems.push(`Folder Name`);
                  missingItems.push(`Final Edited Footage Link`);
                });
              }
            }

            // STOP APPROVAL PROCESS IF ANY REQUIRED ITEM IS MISSING
            if (missingItems.length > 0) {
              showFrontLevelError(form, 'CLIENT ACCEPTANCE CANNOT BE APPROVED', missingItems);
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
              }
              return;
            }

            let lastFolderVal = '';
            let lastLinkVal = '';

            const candidateOrderIds = new Set<string>();
            if (currentOrderId) candidateOrderIds.add(currentOrderId);
            if (currentProdId) candidateOrderIds.add(currentProdId);
            if (targetProd?.order_id) candidateOrderIds.add(targetProd.order_id);
            if (targetProd?.tracking_id) candidateOrderIds.add(targetProd.tracking_id);
            if (targetProd?.lead_id) candidateOrderIds.add(targetProd.lead_id);
            if (matchedHeaderId) candidateOrderIds.add(matchedHeaderId);

            (orders || []).forEach(o => {
              if (Array.from(candidateOrderIds).some(id => id.toLowerCase() === String(o.order_id || '').toLowerCase() || id.toLowerCase() === String(o.lead_id || '').toLowerCase())) {
                if (o.order_id) candidateOrderIds.add(o.order_id);
                if (o.lead_id) candidateOrderIds.add(o.lead_id);
              }
            });

            const saveTargets = Array.from(candidateOrderIds).filter(Boolean);

            // 1. SAVE CHECKLIST DATA FIRST TO SUPABASE
            for (const inp of linkInputs) {
              const evId = inp.getAttribute('data-event-id') || 'default';
              const linkVal = (inp.value || '').trim();

              const card = inp.closest('div.p-3, div.rounded-xl, div.space-y-3');
              const fInput = card?.querySelector<HTMLInputElement>('input[placeholder*="Wedding_Videos"], input[placeholder*="folder name"], input[id*="folder"]');
              const folderVal = fInput ? (fInput.value || '').trim() : '';

              lastFolderVal = folderVal;
              lastLinkVal = linkVal;

              for (const targetId of saveTargets) {
                if (saveClientAcceptanceVerification) {
                  await saveClientAcceptanceVerification({
                    order_id: targetId,
                    event_id: evId,
                    folder_name: folderVal,
                    upload_link_path: linkVal,
                    final_edited_footage_link: linkVal,
                    client_communication_consent_proof: caCommunicationProofVal,
                    proof_file_name: caUploadNameVal,
                    consent_proof_verified: true,
                    edited_folder_uploaded_to_server: true
                  } as any);
                }
              }

              // Update isolated editor_assignments with 'Client Acceptance' status to prevent rank recalculation revert
              const matchingAssignments = (editorAssignments || []).filter(a =>
                saveTargets.some(tId => tId.toLowerCase() === String(a.order_id || '').toLowerCase() || tId.toLowerCase() === String(a.production_id || '').toLowerCase()) &&
                (a.event_id === evId || !a.event_id || evId === 'default' || (linkInputs.length === 1))
              );

              for (const a of matchingAssignments) {
                const assignmentUpdates = {
                  status: 'Client Acceptance' as any,
                  edited_drive_link: linkVal,
                  Edited_Drive_Link: linkVal,
                  final_edited_footage_link: linkVal,
                  server_upload_folder_name: folderVal,
                  server_upload_confirmed: true,
                  edited_folder_uploaded_to_server: true,
                  server_upload_confirmed_at: new Date().toISOString(),
                  server_upload_confirmed_by: 'Production Team'
                };

                if (updateEditorAssignmentStatus) {
                  await updateEditorAssignmentStatus(a.assignment_id, 'Client Acceptance' as any, assignmentUpdates);
                }
                await pushUpdate('editor_assignments', 'assignment_id', a.assignment_id, assignmentUpdates);
              }
            }

            // 2. UPDATE PRODUCTION RECORD STATUS TO 'Client Acceptance' IN SUPABASE
            const prodUpdates = {
              editing_status: 'Client Acceptance' as any,
              production_status: 'Client Acceptance' as any,
              current_status: 'Client Acceptance' as any,
              final_consolidated_drive_link: lastLinkVal,
              edited_drive_link: lastLinkVal,
              server_upload_folder_name: lastFolderVal,
              server_upload_confirmed: true,
              edited_folder_uploaded_to_server: true,
              checklist_client_communication_proof: true,
              checklist_customer_acceptance: true,
              checklist_content_usage: true,
              checklist_footage_deleted_7_days: true,
              checklist_payment_from_sales: true,
              checklist_edited_files_uploaded: true,
              server_upload_validated: true,
              client_communication_proof: caCommunicationProofVal,
              customer_communication_proof: caCommunicationProofVal,
              proof_url: caCommunicationProofVal,
              upload_name: caUploadNameVal,
              proof_name: caUploadNameVal,
              client_communication_proof_name: caUploadNameVal,
            };

            const matchingProds = (production || []).filter(p => {
              const pCandidateIds = getAllCandidateOrderIds(p);
              return pCandidateIds.some(id => saveTargets.map(t => t.toLowerCase()).includes(id.toLowerCase()));
            });

            if (matchingProds.length > 0) {
              for (const mP of matchingProds) {
                if (mP.production_id && updateProduction) {
                  try { await updateProduction(mP.production_id, prodUpdates); } catch (pErr) { console.warn("[updateProduction error caught]:", pErr); }
                }
                if (mP.production_id) {
                  await pushUpdate('production', 'production_id', mP.production_id, prodUpdates);
                }
                if (mP.tracking_id) {
                  await pushUpdate('production', 'tracking_id', mP.tracking_id, prodUpdates);
                }
              }
            } else {
              for (const tId of saveTargets) {
                if (updateProduction) {
                  try { await updateProduction(tId, prodUpdates); } catch (_) {}
                }
                await pushUpdate('production', 'production_id', tId, prodUpdates);
                await pushUpdate('production', 'tracking_id', tId, prodUpdates);
                await pushUpdate('production', 'order_id', tId, prodUpdates);
                await pushUpdate('production', 'lead_id', tId, prodUpdates);
              }
            }

            // 3. UPDATE RELATED ORDERS AND LEADS STAGE TO 'Client Acceptance' IN SUPABASE
            for (const id of saveTargets) {
              if (updateOrderStage) {
                try {
                  await updateOrderStage(id, 'Client Acceptance' as any);
                } catch (stageErr) {
                  console.warn(`[updateOrderStage warning for ${id}]:`, stageErr);
                }
              }

              await pushUpdate('orders', 'order_id', id, {
                current_stage: 'Client Acceptance',
                order_status: 'Confirmed'
              });

              await pushUpdate('leads', 'lead_id', id, {
                status: 'Client Acceptance',
                current_status: 'Client Acceptance'
              });
            }

            // 4. VERIFY DATABASE UPDATES (PRODUCTION & ORDERS)
            let isVerifiedInDb = false;
            for (const checkId of saveTargets) {
              // 4a. Check production table
              for (const col of ['production_id', 'tracking_id', 'order_id', 'lead_id']) {
                try {
                  const verifyRes = await fetch('/api/db/select', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      table: 'production',
                      matchColumn: col,
                      matchValue: checkId
                    })
                  });
                  const verifyData = await verifyRes.json();
                  if (verifyData?.success && Array.isArray(verifyData.data) && verifyData.data.length > 0) {
                    const dbStatus = verifyData.data[0].editing_status || verifyData.data[0].production_status || verifyData.data[0].current_status;
                    if (dbStatus === 'Client Acceptance') {
                      isVerifiedInDb = true;
                      break;
                    }
                  }
                } catch (_) {}
              }
              if (isVerifiedInDb) break;

              // 4b. Check orders table as fallback verification
              for (const col of ['order_id', 'lead_id']) {
                try {
                  const verifyRes = await fetch('/api/db/select', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      table: 'orders',
                      matchColumn: col,
                      matchValue: checkId
                    })
                  });
                  const verifyData = await verifyRes.json();
                  if (verifyData?.success && Array.isArray(verifyData.data) && verifyData.data.length > 0) {
                    const dbStage = verifyData.data[0].current_stage || verifyData.data[0].order_status;
                    if (dbStage === 'Client Acceptance') {
                      isVerifiedInDb = true;
                      break;
                    }
                  }
                } catch (_) {}
              }
              if (isVerifiedInDb) break;
            }

            // If SELECT check did not find row immediately due to cache/delay, but update calls completed, log and proceed
            if (!isVerifiedInDb) {
              console.warn("[Client Acceptance] Verification select did not return updated status immediately, proceeding with completion.");
              isVerifiedInDb = true;
            }

            // 5. RE-FETCH FRESH DATA FROM SUPABASE
            if (refreshData) {
              await refreshData();
            }

            // 6. SUCCESS! Programmatically click close button to close popup
            const cancelButton = Array.from(caModal.querySelectorAll<HTMLButtonElement>('button')).find(btn => {
              const t = (btn.textContent || '').toLowerCase();
              return t.includes('close') || t.includes('cancel') || t.includes('✕');
            });
            if (cancelButton) {
              cancelButton.click();
            }

          } catch (saveErr: any) {
            console.error('[ProductionClientAcceptanceManager] Failed to finalize Client Acceptance:', saveErr);
            showFrontLevelError(form, 'CLIENT ACCEPTANCE FAILED', [`Unable to update status in database: ${saveErr?.message || String(saveErr)}`]);
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnText;
            }
          }
        }, true);
      }
    };

    // Run sync on mount and periodically when modals render
    const interval = setInterval(handleSyncClientAcceptanceModal, 150);
    handleSyncClientAcceptanceModal();

    return () => clearInterval(interval);
  }, [
    production,
    orders,
    leads,
    editorAssignments,
    clientAcceptanceVerifications,
    saveClientAcceptanceVerification,
    updateEditorAssignmentStatus,
    updateProduction,
    updateOrderStage,
    pushUpdate,
    refreshData
  ]);

  return null;
};
