import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDateDDMMYY, formatTime12Hour } from '../../utils';

interface EventItem {
  event_name: string;
  event_date: string;
  event_start_time?: string;
  event_end_date?: string;
  event_end_time?: string;
  shoot_type?: string;
  location?: string;
}

interface ModalState {
  customerName: string;
  orderId: string;
  events: EventItem[];
}

/**
 * ProductionEventManager.tsx
 * 
 * MODULAR PRODUCTION EXTENSION MODULE FOR EVENT DETAILS CENTERED MODAL & ACTION DROPDOWN INTEGRATION
 * 
 * STRICT ARCHITECTURAL CONSTRAINTS:
 * 1. src/components/ProductionModule.tsx is UNTOUCHED (0 edits).
 * 2. Hides separate "Event Details" column from Production Leads table.
 * 3. Integrates "Event Details" as an option inside the existing "Action" dropdown.
 * 4. Displays Event Details in a proper centered responsive modal popup with backdrop overlay.
 * 5. Shows ALL events for orders with multiple events (Event 1, Event 2, Event 3...).
 */
export const ProductionEventManager: React.FC = () => {
  const [modalState, setModalState] = useState<ModalState | null>(null);

  useEffect(() => {
    // Helper: traverse React Fiber tree starting from element to retrieve lead, order, prod objects
    const findObjectsFromFiber = (el: HTMLElement | null): { lead?: any; order?: any; prod?: any } => {
      const res: { lead?: any; order?: any; prod?: any } = {};
      if (!el) return res;

      let curr: any = el;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        const fiberKey = Object.keys(curr).find(
          (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
        );
        if (fiberKey) {
          let fiber = curr[fiberKey];
          let depth = 0;
          while (fiber && depth < 35) {
            const props = fiber.memoizedProps || fiber.pendingProps;
            if (props) {
              if (props.lead && !res.lead) res.lead = props.lead;
              if (props.order && !res.order) res.order = props.order;
              if (props.prod && !res.prod) res.prod = props.prod;
              if (props.openActionDropdown) {
                if (props.openActionDropdown.order && !res.order) res.order = props.openActionDropdown.order;
                if (props.openActionDropdown.prod && !res.prod) res.prod = props.openActionDropdown.prod;
              }
            }
            fiber = fiber.return;
            depth++;
          }
        }
        curr = curr.parentElement;
      }
      return res;
    };

    // Helper: parse extracted objects into standard ModalState with all events
    const extractModalState = (
      leadObj: any,
      orderObj: any,
      prodObj: any,
      targetRow?: HTMLTableRowElement | null
    ): ModalState => {
      const target = leadObj || orderObj || prodObj || {};

      const customerName =
        target.customer_name || target.client_name || prodObj?.customer_name || 'Customer';

      const orderId =
        target.order_id || target.lead_id || target.tracking_id || prodObj?.order_id || prodObj?.tracking_id || '';

      let eventsList: EventItem[] = [];

      const rawEvents = target.events || orderObj?.events || prodObj?.events || leadObj?.events;

      if (rawEvents && Array.isArray(rawEvents) && rawEvents.length > 0) {
        eventsList = rawEvents.map((ev: any, idx: number) => ({
          event_name: ev.event_name || ev.event_type || ev.Event_Name || `Event ${idx + 1}`,
          event_date: ev.event_date || ev.Event_Date || '—',
          event_start_time: ev.event_start_time || ev.event_time || ev.Event_Start_Time || '',
          event_end_date: ev.event_end_date || ev.Event_End_Date || '',
          event_end_time: ev.event_end_time || '',
          shoot_type: ev.event_shoot_type || ev.shoot_type || target.shoot_type || '',
          location: ev.location || ev.venue || ev.google_maps_link || target.location || '',
        }));
      } else if (
        target.event_name ||
        target.Event_Name ||
        target.event_date ||
        target.Event_Date ||
        target.event_type ||
        prodObj?.event_date
      ) {
        eventsList = [
          {
            event_name: target.event_name || target.Event_Name || target.event_type || 'Event 1',
            event_date: target.event_date || target.Event_Date || prodObj?.event_date || '—',
            event_start_time:
              target.event_start_time || target.event_time || target.Event_Start_Time || prodObj?.event_time || '',
            event_end_date: target.event_end_date || target.Event_End_Date || '',
            event_end_time: target.event_end_time || '',
            shoot_type: target.shoot_type || target.event_shoot_type || '',
            location: target.location || target.venue || '',
          },
        ];
      } else {
        // Fallback default item
        eventsList = [
          {
            event_name: 'Event 1',
            event_date: '—',
            event_start_time: '',
            shoot_type: target.shoot_type || '',
          },
        ];
      }

      return {
        customerName,
        orderId,
        events: eventsList,
      };
    };

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

      // 2. Handle Action Dropdown Menu injection & Event Details modal trigger
      const actionDropdown = document.getElementById('production-action-dropdown');
      if (actionDropdown) {
        const existingEventBtn = actionDropdown.querySelector('[data-action-item="event-details"]');
        if (!existingEventBtn) {
          const menuContainer =
            actionDropdown.querySelector('div.flex.flex-col.gap-0\\.5') ||
            actionDropdown.querySelector('div.flex.flex-col');

          if (menuContainer) {
            // Extract Tracking ID / Order ID from Action Menu Header
            const headerIdSpan = actionDropdown.querySelector('span.text-zinc-500');
            const headerText = headerIdSpan?.textContent || '';
            const targetId = headerText.replace(/^ID:\s*/i, '').trim();

            // Find matching row in Production table
            let targetRow: HTMLTableRowElement | null = null;
            const allRows = document.querySelectorAll<HTMLTableRowElement>('table tbody tr');
            allRows.forEach((tr) => {
              const rowText = tr.textContent || '';
              const hasActiveAction =
                tr.querySelector('button.bg-purple-900\\/60') !== null ||
                tr.querySelector('button span:first-child')?.textContent === 'Action';

              if ((targetId && rowText.includes(targetId)) || hasActiveAction) {
                if (!targetRow || (targetId && rowText.includes(targetId))) {
                  targetRow = tr;
                }
              }
            });

            // Create Event Details action menu button
            const eventBtn = document.createElement('button');
            eventBtn.type = 'button';
            eventBtn.setAttribute('data-action-item', 'event-details');
            eventBtn.className =
              'w-full text-left px-2.5 py-2 text-[11px] font-semibold text-amber-300 hover:text-white hover:bg-amber-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer';
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

              // Extract objects using React Fiber starting from actionDropdown, targetRow, and td cells
              let extracted = findObjectsFromFiber(actionDropdown);
              if (!extracted.lead && !extracted.order && targetRow) {
                const rowExtracted = findObjectsFromFiber(targetRow);
                extracted = { ...extracted, ...rowExtracted };
              }

              if (targetRow) {
                const cells = targetRow.querySelectorAll('td');
                cells.forEach((td) => {
                  const cellExtracted = findObjectsFromFiber(td as HTMLElement);
                  if (cellExtracted.lead && !extracted.lead) extracted.lead = cellExtracted.lead;
                  if (cellExtracted.order && !extracted.order) extracted.order = cellExtracted.order;
                  if (cellExtracted.prod && !extracted.prod) extracted.prod = cellExtracted.prod;
                });
              }

              const state = extractModalState(extracted.lead, extracted.order, extracted.prod, targetRow);
              setModalState(state);
            };

            // Insert Event Details button at top of Action menu
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
      attributeFilter: ['style', 'class'],
    });

    window.addEventListener('resize', handleProductionDOMUpdates);
    window.addEventListener('scroll', handleProductionDOMUpdates, { capture: true, passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleProductionDOMUpdates);
      window.removeEventListener('scroll', handleProductionDOMUpdates, { capture: true });
    };
  }, []);

  return (
    <>
      {modalState &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setModalState(null)}
          >
            <div
              className="bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden text-zinc-100 font-sans ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/95 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 text-base shadow-inner">
                    📅
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                      Event Details
                      {modalState.orderId && (
                        <span className="text-xs font-mono font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          #{modalState.orderId}
                        </span>
                      )}
                    </h3>
                    {modalState.customerName && (
                      <p className="text-xs text-zinc-400 font-sans mt-0.5">
                        Client: <span className="text-zinc-200 font-semibold">{modalState.customerName}</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalState(null)}
                  className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition flex items-center justify-center cursor-pointer border border-zinc-700/60"
                  title="Close Modal"
                >
                  <span className="text-base font-bold leading-none">✕</span>
                </button>
              </div>

              {/* Modal Body - Scrollable Container */}
              <div className="p-5 overflow-y-auto space-y-4 max-h-[calc(85vh-130px)] bg-zinc-950/40">
                {modalState.events.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 font-mono text-xs">
                    No specific event records found for this order.
                  </div>
                ) : (
                  modalState.events.map((ev, idx) => {
                    const formattedDate = formatDateDDMMYY(ev.event_date);
                    const formattedTime = formatTime12Hour(ev.event_start_time || ev.event_time);
                    return (
                      <div
                        key={idx}
                        className="bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-4 shadow-lg space-y-3 relative"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {modalState.events.length > 1 ? `EVENT ${idx + 1}` : 'EVENT INFORMATION'}
                          </span>
                          {ev.shoot_type && (
                            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/80 px-2.5 py-0.5 rounded border border-zinc-700/50">
                              {ev.shoot_type}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-0.5">
                              Event Name
                            </span>
                            <span className="font-bold text-white text-sm">{ev.event_name || 'Event'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-0.5">
                              Event Date
                            </span>
                            <span className="font-bold font-mono text-amber-400 text-sm">
                              {formattedDate || '—'}
                            </span>
                          </div>
                          {formattedTime && (
                            <div>
                              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-0.5">
                                Event Time
                              </span>
                              <span className="font-semibold font-mono text-zinc-200">{formattedTime}</span>
                            </div>
                          )}
                          {ev.location && (
                            <div className="sm:col-span-2">
                              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block mb-0.5">
                                Location / Venue
                              </span>
                              <span className="font-normal text-zinc-300 break-words">{ev.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">
                  Total Events: {modalState.events.length}
                </span>
                <button
                  type="button"
                  onClick={() => setModalState(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-mono text-xs font-bold transition cursor-pointer border border-zinc-700/70"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
