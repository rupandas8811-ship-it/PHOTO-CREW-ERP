import React, { useEffect, useState, useRef } from 'react';
import { useRole } from '../RoleContext';
import { EditorAssignment } from '../../types';
import { supabaseClient } from '../../supabaseClient';

export const ProductionAssignedTeamManager: React.FC = () => {
  const { editorAssignments, production, orders, leads, productionStaff } = useRole();
  const [activeProofPreview, setActiveProofPreview] = useState<{
    staffName: string;
    deliverableName: string;
    eventName: string;
    url: string;
  } | null>(null);

  const [dbAssignmentsMap, setDbAssignmentsMap] = useState<Record<string, EditorAssignment>>({});
  const lastFetchedIdRef = useRef<string>('');

  useEffect(() => {
    const isProductionStaffAssignment = (a: any) => {
      if (!a) return false;
      const type = (a.staff_type || a.staffType || a.production_type || a.role || a.speciality || '').toLowerCase();
      const staffName = (a.staff_name || a.staffName || '').toLowerCase();
      if (staffName.includes('photographer') || staffName.includes('cinematographer')) return false;
      if (type.includes('lead') || type.includes('manager') || type.includes('sales')) return false;
      return true;
    };

    const cleanStr = (s?: string | null) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const syncAssignedTeamTable = () => {
      // Find modal containing "Assigned Team" or "Assigned Editor"
      const allModals = Array.from(document.querySelectorAll<HTMLElement>('div.fixed.inset-0'));
      const assignedTeamModal = allModals.find(m => {
        const text = (m.textContent || '').toLowerCase();
        return (
          text.includes('production lead • assigned team') ||
          text.includes('assigned team') ||
          text.includes('assigned editor') ||
          text.includes('editor assigned')
        ) && (
          text.includes('server upload') ||
          text.includes('assigned deliverable') ||
          text.includes('staff name')
        );
      });

      if (!assignedTeamModal) return;

      // Extract production ID / order ID from the header
      const headerTitle = assignedTeamModal.querySelector('h3');
      const headerText = headerTitle?.textContent || '';
      const prodIdMatch = headerText.match(/(PRD-[A-Za-z0-9_-]+|ORD-[A-Za-z0-9_-]+|[A-Za-z0-9_-]{4,})/i);
      const rawHeaderId = prodIdMatch ? prodIdMatch[1].trim() : '';

      // Trigger background direct database fetch if this ID hasn't been fetched yet
      if (rawHeaderId && rawHeaderId !== lastFetchedIdRef.current) {
        lastFetchedIdRef.current = rawHeaderId;
        if (supabaseClient) {
          supabaseClient
            .from('editor_assignments')
            .select('*')
            .or(`production_id.eq.${rawHeaderId},order_id.eq.${rawHeaderId}`)
            .then(({ data }) => {
              if (data && data.length > 0) {
                const map: Record<string, EditorAssignment> = {};
                data.forEach((item: any) => {
                  if (item.assignment_id) {
                    map[item.assignment_id] = item as EditorAssignment;
                  }
                });
                setDbAssignmentsMap(prev => ({ ...prev, ...map }));
              }
            })
            .catch(() => {});
        }
      }

      const targetProd = (production || []).find(p => 
        p.production_id === rawHeaderId || 
        (p as any).order_id === rawHeaderId || 
        p.tracking_id === rawHeaderId
      );
      const orderId = (targetProd as any)?.order_id || targetProd?.tracking_id || targetProd?.production_id || rawHeaderId;

      // Find related order and lead for accurate event name resolution
      const ord = (orders || []).find(o => 
        o.order_id === orderId || 
        o.order_id === targetProd?.production_id || 
        o.order_id === targetProd?.tracking_id ||
        o.id === orderId
      );
      const ld = (leads || []).find(l => 
        l.lead_id === targetProd?.lead_id || 
        l.id === targetProd?.lead_id || 
        (ord && (l.lead_id === ord.lead_id || l.id === ord.lead_id))
      );

      const eventsList = ((targetProd as any)?.events && Array.isArray((targetProd as any).events) && (targetProd as any).events.length > 0)
        ? (targetProd as any).events
        : (ld?.events && Array.isArray(ld.events) && ld.events.length > 0)
          ? ld.events
          : (ord?.events && Array.isArray(ord.events) && ord.events.length > 0)
            ? ord.events
            : [];

      const getEventName = (eventId?: string, fallbackIdx: number = 0) => {
        if (eventId) {
          const found = eventsList.find((e: any) => e.id === eventId || e.event_id === eventId);
          if (found) return found.event_name || found.event_type || `Event ${fallbackIdx + 1}`;
          const match = eventId.match(/EVT-0*(\d+)/i);
          if (match) {
            const idx = parseInt(match[1], 10) - 1;
            if (eventsList[idx]) {
              return eventsList[idx].event_name || eventsList[idx].event_type || `Event ${idx + 1}`;
            }
            return `Event ${idx + 1}`;
          }
        }
        if (eventsList[fallbackIdx]) {
          return eventsList[fallbackIdx].event_name || eventsList[fallbackIdx].event_type || `Event ${fallbackIdx + 1}`;
        }
        return targetProd?.custom_event_name || ord?.event_type || `Event 1`;
      };

      // Gather matching assignments with latest database overrides merged
      const matchingAssignments = (editorAssignments || []).map(a => {
        const dbOverride = dbAssignmentsMap[a.assignment_id];
        return dbOverride ? { ...a, ...dbOverride } : a;
      }).filter(a =>
        (a.production_id === targetProd?.production_id ||
         a.production_id === orderId ||
         a.order_id === orderId ||
         a.order_id === targetProd?.tracking_id ||
         a.order_id === targetProd?.production_id ||
         (rawHeaderId && (a.production_id === rawHeaderId || a.order_id === rawHeaderId))) &&
        isProductionStaffAssignment(a)
      );

      const table = assignedTeamModal.querySelector('table');
      if (!table) return;

      // Ensure header labels are clear and descriptive
      const headers = Array.from(table.querySelectorAll('thead th'));
      if (headers.length >= 6) {
        const header5 = headers[4];
        if (header5 && !header5.textContent?.includes('Server Upload')) {
          header5.textContent = 'Server Upload / Folder';
        }
        const header6 = headers[5];
        if (header6 && header6.textContent?.trim() === 'Upload Link') {
          header6.textContent = 'Server File Link';
        }
      }

      const rows = Array.from(table.querySelectorAll('tbody tr'));
      // Track used assignment IDs to enforce strict 1-to-1 matching and prevent data leakage/duplication across deliverables
      const usedAssignmentIds = new Set<string>();

      rows.forEach((row, rowIdx) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;

        const staffNameCell = cells[0]?.querySelector('.font-bold')?.textContent?.trim() || cells[0]?.textContent?.trim() || '';
        const eventNameCell = cells[1]?.textContent?.trim() || '';
        const deliverableNameCell = cells[2]?.textContent?.trim() || '';

        const cleanStaff = cleanStr(staffNameCell);
        const cleanEvent = cleanStr(eventNameCell);
        const cleanDeliv = cleanStr(deliverableNameCell);

        // Available candidate assignments that haven't been claimed by a previous row
        const availableAssignments = matchingAssignments.filter(a => !usedAssignmentIds.has(a.assignment_id));

        // Matching strategy strictly matching the EXACT production/task/deliverable assignment:
        let matchedAssignment: EditorAssignment | undefined;

        // 1. Deliverable AND Staff AND Event match
        matchedAssignment = availableAssignments.find(a => {
          const aDeliv = cleanStr(a.speciality || a.deliverable_id);
          const aStaff = cleanStr(a.staff_name);
          const aEvt = cleanStr(getEventName(a.event_id));
          return aDeliv === cleanDeliv && (cleanStaff.includes(aStaff) || aStaff.includes(cleanStaff)) && (cleanEvent.includes(aEvt) || aEvt.includes(cleanEvent));
        });

        // 2. Deliverable AND Staff match
        if (!matchedAssignment) {
          matchedAssignment = availableAssignments.find(a => {
            const aDeliv = cleanStr(a.speciality || a.deliverable_id);
            const aStaff = cleanStr(a.staff_name);
            return aDeliv === cleanDeliv && (cleanStaff.includes(aStaff) || aStaff.includes(cleanStaff));
          });
        }

        // 3. Deliverable AND Event match
        if (!matchedAssignment) {
          matchedAssignment = availableAssignments.find(a => {
            const aDeliv = cleanStr(a.speciality || a.deliverable_id);
            const aEvt = cleanStr(getEventName(a.event_id));
            return aDeliv === cleanDeliv && (cleanEvent.includes(aEvt) || aEvt.includes(cleanEvent));
          });
        }

        // 4. Deliverable alone match
        if (!matchedAssignment) {
          matchedAssignment = availableAssignments.find(a => {
            const aDeliv = cleanStr(a.speciality || a.deliverable_id);
            return aDeliv === cleanDeliv;
          });
        }

        // 5. Fallback strictly to matching row position if within available bounds
        if (!matchedAssignment && matchingAssignments[rowIdx] && !usedAssignmentIds.has(matchingAssignments[rowIdx].assignment_id)) {
          matchedAssignment = matchingAssignments[rowIdx];
        }

        if (matchedAssignment) {
          usedAssignmentIds.add(matchedAssignment.assignment_id);
        }

        // Extract Server Upload details ONLY from the exact matched assignment
        // Do NOT fall back to order/prod level to prevent cross-deliverable data contamination
        const serverUploadFolderName = (
          matchedAssignment?.server_upload_folder_name ||
          matchedAssignment?.folder_name ||
          ''
        ).trim();

        const serverFileLink = (
          matchedAssignment?.server_file_link ||
          matchedAssignment?.upload_link ||
          matchedAssignment?.upload_link_path ||
          matchedAssignment?.Edited_Drive_Link ||
          matchedAssignment?.edited_drive_link ||
          ''
        ).trim();

        const isConfirmedUploaded = Boolean(
          matchedAssignment && (
            matchedAssignment.server_upload_confirmed === true ||
            matchedAssignment.edited_folder_uploaded_to_server === true ||
            serverUploadFolderName.length > 0 ||
            serverFileLink.length > 0
          )
        );

        // 1. Update Server Upload Cell (Cell 5, index 4)
        const serverUploadCell = cells[4];
        if (serverUploadCell) {
          const currentCellText = (serverUploadCell.textContent || '').trim();
          if (isConfirmedUploaded) {
            const expectedHTML = `<div class="space-y-1">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold">
                <span>☑</span>
                <span>Uploaded in Server</span>
              </span>
              ${serverUploadFolderName ? `
                <div class="text-[10px] font-mono text-zinc-300 truncate max-w-[175px] flex items-center gap-1 font-semibold" title="${serverUploadFolderName}">
                  <span class="text-zinc-500 font-bold">Folder:</span>
                  <span class="text-emerald-300 font-mono truncate">📁 ${serverUploadFolderName}</span>
                </div>
              ` : `
                <div class="text-[10px] font-mono text-zinc-500 italic">No folder name</div>
              `}
            </div>`;
            
            if (!currentCellText.includes('Uploaded in Server') || (serverUploadFolderName && !currentCellText.includes(serverUploadFolderName))) {
              serverUploadCell.innerHTML = expectedHTML;
            }
          } else {
            // Show standard empty / N/A state when no Server Upload data exists for this specific task
            const expectedHTML = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 text-[11px] font-mono font-semibold">
              <span>☐</span>
              <span>Pending Upload</span>
            </span>`;
            
            if (currentCellText.includes('Uploaded in Server') || currentCellText.includes('📁')) {
              serverUploadCell.innerHTML = expectedHTML;
            }
          }
        }

        // 2. Update Server File Link Cell (Cell 6, index 5)
        const uploadLinkCell = cells[5];
        if (uploadLinkCell) {
          const currentLinkText = (uploadLinkCell.textContent || '').trim();
          if (serverFileLink && (serverFileLink.startsWith('http://') || serverFileLink.startsWith('https://') || serverFileLink.includes('.') || serverFileLink.startsWith('\\\\'))) {
            const fullUrl = (serverFileLink.startsWith('http://') || serverFileLink.startsWith('https://'))
              ? serverFileLink
              : `https://${serverFileLink}`;

            const expectedLinkHTML = `<div class="flex flex-col gap-1 max-w-[200px]">
              <a
                href="${fullUrl}"
                target="_blank"
                rel="noopener noreferrer"
                referrerpolicy="no-referrer"
                class="server-upload-direct-link inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 font-bold text-xs transition-colors cursor-pointer w-fit"
                title="${serverFileLink}"
              >
                <span>🔗</span>
                <span class="font-mono text-[11px]">Open Server Link</span>
                <svg class="w-3.5 h-3.5 shrink-0 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <span class="text-[10px] font-mono text-zinc-400 truncate block max-w-[190px]" title="${serverFileLink}">
                ${serverFileLink}
              </span>
            </div>`;

            if (!currentLinkText.includes('Open Server Link') || !currentLinkText.includes(serverFileLink)) {
              uploadLinkCell.innerHTML = expectedLinkHTML;

              // Ensure clicking the link triggers immediate navigation without interruption
              const linkEl = uploadLinkCell.querySelector('a.server-upload-direct-link') as HTMLAnchorElement | null;
              if (linkEl) {
                linkEl.onclick = (e) => {
                  e.stopPropagation();
                  window.open(fullUrl, '_blank', 'noopener,noreferrer');
                };
              }
            }
          } else {
            // Empty / N/A state
            const expectedEmptyHTML = `<span class="text-zinc-500 italic text-xs font-mono">Pending Upload</span>`;
            if (currentLinkText.includes('Open Link') || currentLinkText.includes('Open Server Link')) {
              uploadLinkCell.innerHTML = expectedEmptyHTML;
            }
          }
        }

        // 3. Customer Proof Cell (Cell 7, index 6)
        const customerProofCell = cells[6];
        if (customerProofCell && matchedAssignment) {
          const proofCandidates = [
            matchedAssignment.confirmation_proof,
            matchedAssignment.customer_review_image,
            matchedAssignment.customer_communication_proof,
            matchedAssignment.client_communication_proof,
            matchedAssignment.proof_url,
            matchedAssignment.proof_image,
            matchedAssignment.uploaded_proof
          ];
          const foundProof = proofCandidates.find(p => typeof p === 'string' && p.trim().length > 0 && p.trim() !== 'null' && p.trim() !== 'undefined') || '';
          
          if (foundProof) {
            const isImg = foundProof.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(foundProof) || foundProof.includes('supabase') || foundProof.includes('blob:');
            const viewBtn = customerProofCell.querySelector('button');
            if (viewBtn && isImg) {
              viewBtn.onclick = (e) => {
                e.stopPropagation();
                setActiveProofPreview({
                  staffName: staffNameCell || matchedAssignment?.staff_name || 'Staff',
                  deliverableName: deliverableNameCell || matchedAssignment?.speciality || 'Deliverable',
                  eventName: eventNameCell || 'Event',
                  url: foundProof
                });
              };
            }
          }
        }
      });
    };

    syncAssignedTeamTable();
    const observer = new MutationObserver(() => {
      syncAssignedTeamTable();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return () => {
      observer.disconnect();
    };
  }, [editorAssignments, production, orders, leads, productionStaff, dbAssignmentsMap]);

  return (
    <>
      {activeProofPreview && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in proof-preview-modal-layer"
          style={{ zIndex: 1000005 }}
          onClick={() => setActiveProofPreview(null)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-900 bg-[#0c0d10] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
                  Uploaded Proof / Image
                </span>
                <h4 className="text-xs font-mono font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>{activeProofPreview.staffName}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-purple-300">{activeProofPreview.deliverableName}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-amber-300">{activeProofPreview.eventName}</span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveProofPreview(null)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 transition cursor-pointer border border-zinc-800"
              >
                ✕
              </button>
            </div>

            {/* Content / Image */}
            <div className="p-6 flex items-center justify-center bg-zinc-900/30 overflow-auto flex-1 min-h-[300px]">
              <img
                src={activeProofPreview.url}
                alt="Proof Preview"
                className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-md border border-zinc-800/80"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.img-error-msg')) {
                    const errDiv = document.createElement('div');
                    errDiv.className = 'img-error-msg text-center p-6 space-y-2';
                    errDiv.innerHTML = `
                      <p class="text-xs text-rose-400 font-mono">Unable to display image preview directly.</p>
                      <a href="${activeProofPreview.url}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" class="inline-block px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition">
                        Open Image in New Window ↗
                      </a>
                    `;
                    parent.appendChild(errDiv);
                  }
                }}
              />
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-zinc-900 bg-[#0c0d10] flex items-center justify-between text-xs">
              <a
                href={activeProofPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="text-indigo-400 hover:text-indigo-300 font-mono text-[11px] flex items-center gap-1.5"
              >
                <span>↗ Open Original File</span>
              </a>
              <button
                type="button"
                onClick={() => setActiveProofPreview(null)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

