import React, { useEffect, useState, useRef } from 'react';
import { useRole } from '../RoleContext';

/**
 * ProductionClientAcceptanceManager.tsx
 * 
 * PRODUCTION DASHBOARD — CLIENT ACCEPTANCE VERIFICATION DECK MANAGER
 * 
 * SCOPE & SPECIFICATIONS:
 * 1. REMOVE EVENT DATE:
 *    - Removes "Event Date *" field and date input from "Edited Folder Uploaded to Server" section.
 *    - Does NOT modify event date stored in Supabase or used elsewhere.
 * 2. KEEP FOLDER NAME:
 *    - Keeps existing "Folder Name *" field exactly as it currently works.
 * 3. ADD FINAL EDITED FOOTAGE LINK:
 *    - Adds "Final Edited Footage Link *" field inside "Edited Folder Uploaded to Server" section.
 *    - Allows user to paste final edited footage URL/link uploaded by the editor.
 * 4. TASK/EVENT DATA ISOLATION:
 *    - Final Edited Footage Link belongs strictly to its specific event/task.
 *    - Multi-event orders have isolated links per event (Event 1 -> Link 1, Event 2 -> Link 2).
 * 5. SUPABASE PERSISTENCE:
 *    - Correctly persists and loads from Supabase (client_acceptance_verifications, editor_assignments, production).
 * 6. ZERO MODIFICATIONS TO ProductionModule.tsx (Strict file rule).
 */

// Programmatically set text input value and trigger React onChange/onInput
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
};

// Helper to extract eventGroup details directly from React Fiber for 100% accuracy
const getEventGroupFromFiber = (el: HTMLElement): { eventId: string; eventName: string } | null => {
  const key = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
  if (!key) return null;

  let fiber = (el as any)[key];
  while (fiber) {
    if (fiber.key && String(fiber.key).startsWith('manual_conf_')) {
      const eventId = String(fiber.key).replace('manual_conf_', '');
      
      // Try to find the group name from React Fiber props
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

      // Extract Order / Production ID from header or badges
      const headerTitle = caModal.querySelector('h3');
      const headerText = headerTitle?.textContent || caModal.textContent || '';
      const prodIdMatch = headerText.match(/(PRD-[A-Za-z0-9_-]+|ORD-[A-Za-z0-9_-]+)/i);
      const matchedHeaderId = prodIdMatch ? prodIdMatch[1].trim() : '';

      // Match target production record
      const targetProd = (production || []).find(p =>
        p.production_id === matchedHeaderId ||
        (p as any).order_id === matchedHeaderId ||
        p.tracking_id === matchedHeaderId ||
        (matchedHeaderId && (p.production_id?.toLowerCase() === matchedHeaderId.toLowerCase() || p.tracking_id?.toLowerCase() === matchedHeaderId.toLowerCase()))
      ) || (production || []).find(p => {
        const custName = (p as any).customer_name || '';
        return custName && headerText.includes(custName);
      });

      const orderId = (targetProd as any)?.order_id || targetProd?.tracking_id || targetProd?.production_id || matchedHeaderId;
      const prodId = targetProd?.production_id || matchedHeaderId;

      if (orderId) activeOrderIdRef.current = orderId;
      if (prodId) activeProdIdRef.current = prodId;

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
          const matchedLead = (leads || []).find(l => l.id === orderId || (l as any).order_id === orderId || (l as any).lead_id === orderId || (l as any).lead_id === targetProd?.lead_id);
          const matchedOrder = (orders || []).find(o => o.order_id === orderId || (o as any).id === orderId || (o as any).lead_id === orderId);
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

        // 2. FETCH PREVIOUS SAVED VALUES FOR AUTOFILL
        const cleanOrd = String(orderId || '').trim().toLowerCase();
        const cleanEvt = String(eventId || 'default').trim().toLowerCase();

        const savedVerif = (clientAcceptanceVerifications || []).find(v =>
          String(v.order_id || '').trim().toLowerCase() === cleanOrd &&
          (String(v.event_id || 'default').trim().toLowerCase() === cleanEvt ||
           String(v.event_id || '').trim().toLowerCase() === eventName.toLowerCase())
        );

        let savedFolderName = savedVerif?.folder_name || '';
        let savedLink = savedVerif?.final_edited_footage_link || savedVerif?.upload_link_path || '';

        const matchingAssignment = (editorAssignments || []).find(a =>
          (a.order_id === orderId || a.production_id === prodId || a.production_id === orderId) &&
          (a.event_id === eventId || a.event_id === eventName)
        );

        if (!savedFolderName) {
          savedFolderName = matchingAssignment?.server_upload_folder_name || targetProd?.server_upload_folder_name || '';
        }
        if (!savedLink) {
          savedLink = matchingAssignment?.edited_drive_link || (matchingAssignment as any)?.Edited_Drive_Link || (matchingAssignment as any)?.delivery_link || '';
        }

        // Check the "Edited Folder Uploaded to Server" checkbox if there's saved data
        const checkbox = eventCard.querySelector<HTMLInputElement>('input[type="checkbox"]');
        const isAutofilled = eventCard.getAttribute('data-ca-autofilled') === 'true';

        if (!isAutofilled && (savedFolderName || savedLink) && checkbox && !checkbox.checked) {
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
          if (!isAutofilled && savedFolderName && folderInput.value !== savedFolderName) {
            setTextInputValue(folderInput, savedFolderName);
          }
        }

        // 3 & 4. ADD FINAL EDITED FOOTAGE LINK: Injected inside event card with strict event data isolation
        const gridContainer = eventCard.querySelector('div.grid') as HTMLElement | null;
        if (gridContainer) {
          // Adjust grid to 2 columns on desktop so Folder Name and Final Edited Footage Link sit side by side
          gridContainer.classList.remove('ca-folder-single-col');
          gridContainer.style.setProperty('grid-template-columns', 'repeat(auto-fit, minmax(240px, 1fr))', 'important');

          let linkWrapper = gridContainer.querySelector(`.ca-final-footage-link-group[data-event-id="${eventId}"]`) as HTMLElement | null;
          if (!linkWrapper) {
            // Check if there's an older group to replace
            const oldGroup = gridContainer.querySelector('.ca-final-footage-link-group');
            if (oldGroup && oldGroup.getAttribute('data-event-id') !== eventId) {
              oldGroup.remove();
            }

            linkWrapper = document.createElement('div');
            linkWrapper.className = 'space-y-1 ca-final-footage-link-group';
            linkWrapper.setAttribute('data-event-id', eventId);

            // Fetch initial saved link into isolated ref/state
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

            // Attach input event listener for realtime typing / pasting
            const inputEl = linkWrapper.querySelector<HTMLInputElement>('input.ca-final-footage-link-input');
            if (inputEl) {
              inputEl.addEventListener('input', (e) => {
                const val = (e.target as HTMLInputElement).value;
                setEventLinks(prev => ({ ...prev, [eventId]: val }));
              });
            }
          } else {
            // Keep input in sync with state if value changed
            const inputEl = linkWrapper.querySelector<HTMLInputElement>('input.ca-final-footage-link-input');
            if (inputEl && document.activeElement !== inputEl) {
              const currentVal = eventLinksRef.current[eventId] || savedLink || '';
              if (inputEl.value !== currentVal) {
                inputEl.value = currentVal;
              }
            }
          }
        }

        // Mark as fully autofilled once inputs are successfully synchronized
        if (!isAutofilled) {
          const hasFolderToFill = !!savedFolderName;
          const hasFolderInDOM = !!folderInput;
          const hasLinkInDOM = !!eventCard.querySelector('input.ca-final-footage-link-input');

          const isFullyAutofilled = (!hasFolderToFill || (hasFolderInDOM && folderInput.value === savedFolderName)) && hasLinkInDOM;
          if (isFullyAutofilled) {
            eventCard.setAttribute('data-ca-autofilled', 'true');
          }
        }
      });

      // 5. Intercept "Approve Client Acceptance" form submission to ensure Supabase persistence & strict validation
      const form = caModal.querySelector('form');
      if (form && !form.dataset.caEnhanced) {
        form.dataset.caEnhanced = 'true';

        // Listen in the CAPTURING phase to run BEFORE React's delegated listener at document root
        form.addEventListener('submit', async (e) => {
          // Stop React's default form submit from firing
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const currentOrderId = activeOrderIdRef.current || orderId;
          const currentProdId = activeProdIdRef.current || prodId;

          // Find the submit button to show feedback
          const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
          const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>⏳</span> Submitting...';
          }

          try {
            // Collect all link inputs currently in the modal
            const linkInputs = Array.from(caModal.querySelectorAll<HTMLInputElement>('input.ca-final-footage-link-input'));
            
            // STRICT VALIDATION
            for (const inp of linkInputs) {
              const card = inp.closest('div.p-3, div.rounded-xl, div.space-y-3');
              const fInput = card?.querySelector<HTMLInputElement>('input[placeholder*="Wedding_Videos"], input[placeholder*="folder name"], input[id*="folder"]');
              const folderVal = fInput ? (fInput.value || '').trim() : '';
              const linkVal = (inp.value || '').trim();

              if (!folderVal) {
                alert(`Folder Name is required for all uploaded folders.`);
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = originalBtnText;
                }
                return;
              }

              if (!linkVal) {
                alert(`Final Edited Footage Link is required for all uploaded folders.`);
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = originalBtnText;
                }
                return;
              }
            }

            // Extract proof URL and name from DOM to save to DB
            const proofImg = caModal.querySelector<HTMLImageElement>('img[alt*="Proof"], img[alt*="Communication"]');
            const proofLink = caModal.querySelector<HTMLAnchorElement>('a[href*="storage"], a[href*="firebasestorage"], a[href*="proof"]');
            const caCommunicationProofVal = proofImg?.src || proofLink?.href || '';
            
            const proofNameSpan = caModal.querySelector<HTMLElement>('span.truncate');
            const caUploadNameVal = proofNameSpan?.textContent || 'Uploaded Proof Document';

            let lastFolderVal = '';
            let lastLinkVal = '';

            // 1. Process all isolated saves per event/task
            for (const inp of linkInputs) {
              const evId = inp.getAttribute('data-event-id') || 'default';
              const linkVal = (inp.value || '').trim();

              const card = inp.closest('div.p-3, div.rounded-xl, div.space-y-3');
              const fInput = card?.querySelector<HTMLInputElement>('input[placeholder*="Wedding_Videos"], input[placeholder*="folder name"], input[id*="folder"]');
              const folderVal = fInput ? (fInput.value || '').trim() : '';

              lastFolderVal = folderVal;
              lastLinkVal = linkVal;

              if (currentOrderId) {
                // Save isolated record to Client Acceptance Verification table (Supabase & file sync)
                if (saveClientAcceptanceVerification) {
                  await saveClientAcceptanceVerification({
                    order_id: currentOrderId,
                    event_id: evId,
                    folder_name: folderVal,
                    upload_link_path: linkVal,
                    final_edited_footage_link: linkVal,
                    client_communication_consent_proof: caCommunicationProofVal,
                    proof_file_name: caUploadNameVal,
                    consent_proof_verified: true
                  });
                }

                // Update isolated editor_assignments for this specific task
                const matchingAssignments = (editorAssignments || []).filter(a =>
                  (a.order_id === currentOrderId || a.production_id === currentProdId || a.production_id === currentOrderId) &&
                  (a.event_id === evId || !a.event_id || evId === 'default' || (linkInputs.length === 1))
                );

                for (const a of matchingAssignments) {
                  const assignmentUpdates = {
                    edited_drive_link: linkVal,
                    Edited_Drive_Link: linkVal,
                    final_edited_footage_link: linkVal,
                    server_upload_folder_name: folderVal,
                    server_upload_confirmed: true,
                    server_upload_confirmed_at: new Date().toISOString(),
                    server_upload_confirmed_by: 'Production Team'
                  };

                  if (updateEditorAssignmentStatus) {
                    await updateEditorAssignmentStatus(a.assignment_id, a.status as any, assignmentUpdates);
                  }
                  await pushUpdate('editor_assignments', 'assignment_id', a.assignment_id, assignmentUpdates);
                }
              }
            }

            // 2. Update production record status to 'Client Acceptance' and write consolidated links
            if (currentProdId && updateProduction) {
              const prodUpdates = {
                editing_status: 'Client Acceptance' as any,
                production_status: 'Client Acceptance' as any,
                current_status: 'Client Acceptance' as any,
                final_consolidated_drive_link: lastLinkVal,
                edited_drive_link: lastLinkVal,
                server_upload_folder_name: lastFolderVal,
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

              await updateProduction(currentProdId, prodUpdates);
              await pushUpdate('production', 'production_id', currentProdId, prodUpdates);
            }

            // 3. Update order stage to 'Client Acceptance' in Supabase orders & leads tables
            if (currentOrderId && updateOrderStage) {
              await updateOrderStage(currentOrderId, 'Client Acceptance' as any);
            }

            // 4. Force a clean refresh of data in the dashboard context
            if (refreshData) {
              await refreshData();
            }

            // 5. Success! Programmatically click the native cancel button to close the modal safely
            const cancelButton = Array.from(caModal.querySelectorAll<HTMLButtonElement>('button')).find(btn => {
              const t = (btn.textContent || '').toLowerCase();
              return t.includes('cancel');
            });
            if (cancelButton) {
              cancelButton.click();
            }

          } catch (saveErr: any) {
            console.error('[ProductionClientAcceptanceManager] Failed to finalize Client Acceptance:', saveErr);
            alert(`Approval failed! Please check your connection and try again.\nError: ${saveErr?.message || String(saveErr)}`);
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
