import React, { useEffect } from 'react';

/**
 * ProductionFullScreenManager.tsx
 * 
 * ENHANCEMENT CONTROLLER FOR PRODUCTION ASSIGNMENT POPUPS
 * 
 * Mandated Full-Screen Page-Like Interfaces:
 * 1. Production Lead • Assigned Team
 * 2. Reassign popup (reassign_staff)
 * 3. Assign Editor popup (assign_editor)
 * 
 * STRICT ARCHITECTURAL CONSTRAINTS:
 * - src/components/ProductionModule.tsx is UNTOUCHED (0 edits).
 * - Only affects the 3 requested Production interfaces.
 * - Leaves all other Production modals, workflows, and dashboards intact.
 */
export const ProductionFullScreenManager: React.FC = () => {
  useEffect(() => {
    const handleDOMCheck = () => {
      // Find all fixed modal overlays in the document
      const overlays = document.querySelectorAll<HTMLElement>('div.fixed.inset-0');

      overlays.forEach((overlay) => {
        const textContent = overlay.textContent || '';

        // Check if this overlay corresponds strictly to one of the 3 requested interfaces:
        const isAssignedTeam = textContent.includes('Production Lead • Assigned Team');
        const isReassign = textContent.includes('Reassign Staff') || textContent.includes('Reassign Production Task');
        const isAssignEditor = textContent.includes('Assign Editor');

        if (isAssignedTeam || isReassign || isAssignEditor) {
          // 1. Mark overlay as full screen page view
          if (!overlay.classList.contains('prod-fullscreen-overlay')) {
            overlay.classList.add('prod-fullscreen-overlay');
          }

          // 2. Mark inner card as full screen container
          const modalCard = overlay.querySelector<HTMLElement>('#production_workflow_modal') ||
            overlay.querySelector<HTMLElement>('div.bg-zinc-950') ||
            (overlay.firstElementChild as HTMLElement);

          if (modalCard && !modalCard.classList.contains('prod-fullscreen-card')) {
            modalCard.classList.add('prod-fullscreen-card');
          }

          // 3. Mark header element
          if (modalCard) {
            const header = modalCard.querySelector<HTMLElement>('div.p-5.border-b') ||
              modalCard.querySelector<HTMLElement>('div.border-b') ||
              (modalCard.firstElementChild as HTMLElement);

            if (header && !header.classList.contains('prod-fullscreen-header')) {
              header.classList.add('prod-fullscreen-header');
            }

            // 4. Mark body element
            const body = modalCard.querySelector<HTMLElement>('div.overflow-y-auto') ||
              modalCard.querySelector<HTMLElement>('div.p-5') ||
              modalCard.querySelector<HTMLElement>('div.p-4') ||
              modalCard.querySelector<HTMLElement>('div.p-3\\.5');

            if (body && !body.classList.contains('prod-fullscreen-body')) {
              body.classList.add('prod-fullscreen-body');
            }
          }

          // Disable background page scrolling while full-screen view is active
          document.body.style.overflow = 'hidden';
        }
      });

      // Restore scroll if no target full-screen overlay is active
      const activeFullScreenModal = document.querySelector('.prod-fullscreen-overlay');
      if (!activeFullScreenModal) {
        if (document.body.style.overflow === 'hidden') {
          document.body.style.overflow = '';
        }
      }
    };

    // Run check immediately and on DOM updates
    handleDOMCheck();

    const observer = new MutationObserver(() => {
      handleDOMCheck();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    window.addEventListener('resize', handleDOMCheck);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleDOMCheck);
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
      }
    };
  }, []);

  return null;
};
