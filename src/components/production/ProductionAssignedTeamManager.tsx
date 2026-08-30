import React, { useEffect, useState } from 'react';
import { useRole } from '../RoleContext';
import { EditorAssignment } from '../../types';

export const ProductionAssignedTeamManager: React.FC = () => {
  const { editorAssignments, production, orders, leads, productionStaff } = useRole();
  const [activeProofPreview, setActiveProofPreview] = useState<{
    staffName: string;
    deliverableName: string;
    eventName: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    const isProductionStaffAssignment = (a: any) => {
      if (!a) return false;
      const type = (a.staff_type || a.staffType || a.production_type || a.role || a.speciality || '').toLowerCase();
      const staffName = (a.staff_name || a.staffName || '').toLowerCase();
      if (staffName.includes('photographer') || staffName.includes('cinematographer')) return false;
      if (type.includes('lead') || type.includes('manager') || type.includes('sales')) return false;
      return true;
    };

    const syncAssignedTeamTable = () => {
      // Find modal containing "Production Lead • Assigned Team"
      const allModals = Array.from(document.querySelectorAll<HTMLElement>('div.fixed.inset-0'));
      const assignedTeamModal = allModals.find(m => {
        const text = (m.textContent || '').toLowerCase();
        return text.includes('production lead • assigned team') || (text.includes('assigned team') && text.includes('server upload'));
      });

      if (!assignedTeamModal) return;

      // Extract production ID / order ID from the header
      const headerTitle = assignedTeamModal.querySelector('h3');
      const headerText = headerTitle?.textContent || '';
      const prodIdMatch = headerText.match(/(PRD-[A-Za-z0-9_-]+|ORD-[A-Za-z0-9_-]+|[A-Za-z0-9_-]{4,})/i);
      const rawHeaderId = prodIdMatch ? prodIdMatch[1].trim() : '';

      const targetProd = (production || []).find(p => 
        p.production_id === rawHeaderId || 
        (p as any).order_id === rawHeaderId || 
        p.tracking_id === rawHeaderId
      );
      const orderId = (targetProd as any)?.order_id || targetProd?.tracking_id || targetProd?.production_id || rawHeaderId;

      const matchingAssignments = (editorAssignments || []).filter(a =>
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

      const rows = Array.from(table.querySelectorAll('tbody tr'));
      rows.forEach((row, rowIdx) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;

        const staffNameCell = cells[0]?.querySelector('.font-bold')?.textContent?.trim() || cells[0]?.textContent?.trim() || '';
        const eventNameCell = cells[1]?.textContent?.trim() || '';
        const deliverableNameCell = cells[2]?.textContent?.trim() || '';

        // Match to specific assignment
        let matchedAssignment: EditorAssignment | undefined = matchingAssignments[rowIdx];
        if (!matchedAssignment && matchingAssignments.length > 0) {
          matchedAssignment = matchingAssignments.find(a => {
            const aStaff = (a.staff_name || '').trim();
            const aDeliv = (a.speciality || a.deliverable_id || '').trim();
            return (!staffNameCell || aStaff === staffNameCell) && (!deliverableNameCell || aDeliv === deliverableNameCell);
          });
        }

        // Strict individual Server Upload check: ONLY use this assignment's fields
        const hasIndividualServerUpload = Boolean(
          matchedAssignment?.server_upload_confirmed === true ||
          matchedAssignment?.edited_folder_uploaded_to_server === true ||
          (typeof matchedAssignment?.server_upload_folder_name === 'string' && matchedAssignment.server_upload_folder_name.trim().length > 0)
        );
        const folderName = (matchedAssignment?.server_upload_folder_name || '').trim();

        // 1. Update Server Upload Cell (Cell 5, index 4)
        const serverUploadCell = cells[4];
        if (serverUploadCell) {
          const currentCellText = (serverUploadCell.textContent || '').trim();
          if (hasIndividualServerUpload) {
            const expectedHTML = `<div class="space-y-1">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold">
                <span>☑</span>
                <span>Uploaded in Server</span>
              </span>
              ${folderName ? `<div class="text-[10px] font-mono text-zinc-400 truncate max-w-[160px]" title="${folderName}">📁 ${folderName}</div>` : ''}
            </div>`;
            
            if (!currentCellText.includes('Uploaded in Server') || !currentCellText.includes(folderName)) {
              serverUploadCell.innerHTML = expectedHTML;
            }
          } else {
            const expectedHTML = `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800 text-[11px] font-mono font-semibold">
              <span>☐</span>
              <span>Pending Upload</span>
            </span>`;
            
            if (currentCellText.includes('Uploaded in Server') || currentCellText.includes('📁')) {
              serverUploadCell.innerHTML = expectedHTML;
            }
          }
        }

        // 2. Update Upload Link Cell (Cell 6, index 5)
        const uploadLinkCell = cells[5];
        if (uploadLinkCell && matchedAssignment) {
          const rawLink = (
            matchedAssignment.Edited_Drive_Link ||
            matchedAssignment.edited_drive_link ||
            ''
          ).trim();

          const currentLinkText = (uploadLinkCell.textContent || '').trim();
          if (rawLink && (rawLink.startsWith('http://') || rawLink.startsWith('https://') || rawLink.includes('.'))) {
            const fullUrl = rawLink.startsWith('http') ? rawLink : `https://${rawLink}`;
            const expectedLinkHTML = `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 font-bold text-xs transition-colors cursor-pointer" title="${fullUrl}">
              <span>🔗 Open Link</span>
            </a>`;
            if (!currentLinkText.includes('Open Link')) {
              uploadLinkCell.innerHTML = expectedLinkHTML;
            }
          } else if (!rawLink && currentLinkText.includes('Open Link')) {
            uploadLinkCell.innerHTML = `<span class="text-zinc-500 italic text-xs font-mono">Pending Upload</span>`;
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
              // Ensure clicking view image activates our top-layer preview modal
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
  }, [editorAssignments, production, orders, leads, productionStaff]);

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
