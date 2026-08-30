import React, { useEffect } from 'react';

/**
 * ProductionEventManager.tsx
 * 
 * MODULAR PRODUCTION EXTENSION MODULE FOR EVENT DETAILS & ACTION DROPDOWN INTEGRATION
 * 
 * STRICT ARCHITECTURAL CONSTRAINTS:
 * 1. src/components/ProductionModule.tsx is UNTOUCHED (0 edits).
 * 2. Hides separate "Event Details" column from Production Leads table.
 * 3. Integrates "Event Details" as an option inside the existing "Action" dropdown.
 * 4. Shows exact Event Name, Event Date, and Event Time specific to the selected row/lead.
 */
export const ProductionEventManager: React.FC = () => {
  useEffect(() => {
    const handleProductionDOMUpdates = () => {
      // 1. Locate Production Leads tables and hide "Event Details" column
      const tables = document.querySelectorAll<HTMLTableElement>('table');
      tables.forEach((table) => {
        const headers = table.querySelectorAll('th');
        let eventDetailsColIdx = -1;

        headers.forEach((th, idx) => {
          const text = (th.textContent || '').trim().toLowerCase();
          if (text === 'event details') {
            eventDetailsColIdx = idx;
            if (th.style.display !== 'none') {
              th.style.display = 'none';
            }
          }
        });

        if (eventDetailsColIdx !== -1) {
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells[eventDetailsColIdx]) {
              const td = cells[eventDetailsColIdx] as HTMLElement;
              if (td.style.display !== 'none') {
                td.style.display = 'none';
              }
            }
          });
        }
      });

      // 2. Handle Floating Action Dropdown Menu injection
      const actionDropdown = document.getElementById('production-action-dropdown');
      if (actionDropdown) {
        const existingEventBtn = actionDropdown.querySelector('[data-action-item="event-details"]');
        if (!existingEventBtn) {
          const menuContainer = actionDropdown.querySelector('div.flex.flex-col.gap-0\\.5') ||
            actionDropdown.querySelector('div.flex.flex-col');

          if (menuContainer) {
            // Extract Tracking ID / Order ID from Action Menu Header
            const headerIdSpan = actionDropdown.querySelector('span.text-zinc-500');
            const headerText = headerIdSpan?.textContent || '';
            const targetId = headerText.replace(/^ID:\s*/i, '').trim();

            // Find matching row in Production table
            let targetRow: HTMLTableRowElement | null = null;
            let targetColIdx = -1;

            const allRows = document.querySelectorAll<HTMLTableRowElement>('table tbody tr');
            allRows.forEach((tr) => {
              const rowText = tr.textContent || '';
              // Check if row contains the tracking ID or order ID or active Action button
              const hasActiveAction = tr.querySelector('button.bg-purple-900\\/60') !== null ||
                tr.querySelector('button span:first-child')?.textContent === 'Action';
              
              if ((targetId && rowText.includes(targetId)) || hasActiveAction) {
                // Confirm table header has Event Details
                const table = tr.closest('table');
                if (table) {
                  const headers = table.querySelectorAll('th');
                  headers.forEach((th, idx) => {
                    if ((th.textContent || '').trim().toLowerCase() === 'event details') {
                      targetColIdx = idx;
                    }
                  });
                }
                if (!targetRow || (targetId && rowText.includes(targetId))) {
                  targetRow = tr;
                }
              }
            });

            // Create Event Details action menu button
            const eventBtn = document.createElement('button');
            eventBtn.type = 'button';
            eventBtn.setAttribute('data-action-item', 'event-details');
            eventBtn.className = 'w-full text-left px-2.5 py-2 text-[11px] font-semibold text-amber-300 hover:text-white hover:bg-amber-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer';
            eventBtn.innerHTML = `
              <span class="text-sm">📅</span>
              <span>Event Details</span>
            `;

            eventBtn.onclick = (e) => {
              e.stopPropagation();

              // Close action dropdown
              const backdrop = actionDropdown.parentElement?.querySelector('div.fixed.inset-0.bg-transparent') as HTMLElement;
              if (backdrop) {
                backdrop.click();
              } else {
                actionDropdown.style.display = 'none';
              }

              // Trigger event dropdown cell button for specific row
              if (targetRow && targetColIdx !== -1) {
                const td = (targetRow as HTMLTableRowElement).cells[targetColIdx] as HTMLElement;
                if (td) {
                  // Temporarily make td available for getBoundingClientRect calculations
                  td.style.display = 'table-cell';
                  td.style.visibility = 'hidden';

                  const cellBtn = td.querySelector<HTMLButtonElement>('button');
                  if (cellBtn) {
                    cellBtn.click();
                  }

                  requestAnimationFrame(() => {
                    if (td) {
                      td.style.display = 'none';
                      td.style.visibility = '';
                    }
                  });
                  return;
                }
              }

              // Fallback: search for event button in any matching row
              if (targetRow) {
                const cellBtn = (targetRow as HTMLTableRowElement).querySelector<HTMLButtonElement>('button[title*="Event"]') ||
                  (targetRow as HTMLTableRowElement).querySelector<HTMLButtonElement>('td button');
                if (cellBtn) {
                  cellBtn.click();
                }
              }
            };

            // Insert Event Details button into top of Action menu
            const firstChild = menuContainer.firstElementChild;
            if (firstChild) {
              menuContainer.insertBefore(eventBtn, firstChild);
            } else {
              menuContainer.appendChild(eventBtn);
            }
          }
        }
      }
    };

    handleProductionDOMUpdates();

    const observer = new MutationObserver(() => {
      handleProductionDOMUpdates();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    window.addEventListener('resize', handleProductionDOMUpdates);
    window.addEventListener('scroll', handleProductionDOMUpdates, { capture: true, passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleProductionDOMUpdates);
      window.removeEventListener('scroll', handleProductionDOMUpdates, { capture: true });
    };
  }, []);

  return null;
};
