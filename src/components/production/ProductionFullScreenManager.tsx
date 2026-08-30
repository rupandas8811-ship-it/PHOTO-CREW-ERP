import React, { useEffect, useRef } from 'react';

/**
 * ProductionFullScreenManager.tsx
 * 
 * SCROLL-LOCKING & FULL-SCREEN VIEWPORT MANAGER FOR PRODUCTION ASSIGNMENT INTERFACES
 * 
 * Target Interfaces:
 * 1. Production Lead • Assigned Team
 * 2. Reassign
 * 3. Assign Editor
 * 4. Assign Operations Staff
 * 
 * STRICT CONSTRAINTS:
 * - src/components/ProductionModule.tsx is UNTOUCHED (0 edits).
 * - Background Production Dashboard is LOCKED when open.
 * - Scroll position restored cleanly when closed.
 */
export const ProductionFullScreenManager: React.FC = () => {
  const isLockedRef = useRef(false);
  const savedScrollYRef = useRef(0);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const headerElem = document.querySelector<HTMLElement>('header');
      if (headerElem) {
        const rect = headerElem.getBoundingClientRect();
        const height = Math.round(rect.height || headerElem.offsetHeight || 64);
        if (height > 0) {
          document.documentElement.style.setProperty('--prod-nav-header-height', `${height}px`);
        }
      }
    };

    updateHeaderHeight();

    let headerObserver: ResizeObserver | null = null;
    const headerElem = document.querySelector<HTMLElement>('header');
    if (headerElem && typeof ResizeObserver !== 'undefined') {
      headerObserver = new ResizeObserver(() => {
        updateHeaderHeight();
      });
      headerObserver.observe(headerElem);
    }

    const checkIsTargetOverlay = (overlay: HTMLElement): boolean => {
      const text = (overlay.textContent || '').toLowerCase();
      
      const isAssignedTeam = text.includes('assigned team') || text.includes('assigned team members');
      const isReassign = text.includes('reassign staff') || 
                         text.includes('reassign editor') || 
                         text.includes('reassign production task') || 
                         text.includes('reassign staff (deliverable-wise)') || 
                         (text.includes('reassign') && text.includes('step workflow wizard'));
      const isAssignEditor = text.includes('assign editor');
      const isAssignOps = text.includes('assign operations staff') || 
                          text.includes('assign operations') || 
                          (text.includes('operations staff') && text.includes('assign'));

      return isAssignedTeam || isReassign || isAssignEditor || isAssignOps;
    };

    const lockBackground = () => {
      if (isLockedRef.current) return;
      savedScrollYRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      isLockedRef.current = true;
    };

    const unlockBackground = () => {
      if (!isLockedRef.current) return;

      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';

      window.scrollTo(0, savedScrollYRef.current);
      isLockedRef.current = false;
    };

    const handleDOMCheck = () => {
      updateHeaderHeight();
      const overlays = document.querySelectorAll<HTMLElement>('div.fixed.inset-0');
      let hasActiveTargetModal = false;

      overlays.forEach((overlay) => {
        if (checkIsTargetOverlay(overlay)) {
          hasActiveTargetModal = true;

          // Teleport overlay directly to document.body to un-nest from sidebar / container bounds
          if (overlay.parentElement && overlay.parentElement !== document.body) {
            document.body.appendChild(overlay);
          }

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

            // 5. Mark footer / action button containers if present
            if (body) {
              const actionContainers = body.querySelectorAll<HTMLElement>('div.flex.gap-3, div.flex.items-center.gap-3, div.pt-2, div.pt-4');
              actionContainers.forEach((container) => {
                const buttons = container.querySelectorAll('button');
                if (buttons.length > 0 && !container.classList.contains('prod-fullscreen-footer')) {
                  container.classList.add('prod-fullscreen-footer');
                }
              });

              const tables = body.querySelectorAll('table');
              tables.forEach((table) => {
                const parent = table.parentElement;
                if (parent && !parent.classList.contains('prod-fullscreen-table-wrapper')) {
                  parent.classList.add('prod-fullscreen-table-wrapper');
                }
              });
            }
          }
        }
      });

      if (hasActiveTargetModal) {
        lockBackground();
      } else {
        unlockBackground();
      }
    };

    // Prevent mouse wheel scrolling on backdrop when locked
    const handleWheel = (e: WheelEvent) => {
      if (!isLockedRef.current) return;
      const activeModal = document.querySelector('.prod-fullscreen-overlay');
      if (!activeModal) return;

      const bodyElem = activeModal.querySelector('.prod-fullscreen-body');
      if (bodyElem && bodyElem.contains(e.target as Node)) {
        return;
      }
      e.preventDefault();
    };

    // Prevent touch dragging on backdrop when locked
    const handleTouchMove = (e: TouchEvent) => {
      if (!isLockedRef.current) return;
      const activeModal = document.querySelector('.prod-fullscreen-overlay');
      if (!activeModal) return;

      const bodyElem = activeModal.querySelector('.prod-fullscreen-body');
      if (bodyElem && bodyElem.contains(e.target as Node)) {
        return;
      }
      e.preventDefault();
    };

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
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      if (headerObserver) headerObserver.disconnect();
      observer.disconnect();
      window.removeEventListener('resize', handleDOMCheck);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      if (isLockedRef.current) {
        unlockBackground();
      }
    };
  }, []);

  return null;
};
