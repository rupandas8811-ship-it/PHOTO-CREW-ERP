/**
 * Universal Viewport & Auto-Scroll Controller for Popups, Modals, and Overlays.
 * 
 * Ensures that whenever ANY modal, popup, dialog, or overlay opens across ANY dashboard:
 * 1. The modal / popup is brought into the user's visible viewport if partially off-screen.
 * 2. Any internal scrollable container inside the modal automatically resets to the TOP (scrollTop = 0).
 * 3. Supports nested / child popups without disrupting parent state.
 * 4. Works seamlessly across mobile, tablet, desktop, and large displays.
 */

// Track elements that have already had their initial open scroll-reset applied for the current mount/display cycle
const activeModalSet = new WeakSet<HTMLElement>();

/**
 * Resets the scroll position of an element and all its internal scrollable children to top (scrollTop = 0).
 */
export function resetInternalScrollContainersToTop(container: HTMLElement) {
  if (!container) return;

  const resetElement = (el: HTMLElement) => {
    try {
      if (el.scrollTop !== 0) {
        el.scrollTop = 0;
      }
      if (el.scrollLeft !== 0) {
        el.scrollLeft = 0;
      }
    } catch {
      // Ignore any read-only or detached DOM errors
    }
  };

  // Reset the container itself if it is scrollable
  resetElement(container);

  // Find all internal scrollable child elements
  const scrollableElements = container.querySelectorAll<HTMLElement>(
    '.overflow-y-auto, .overflow-auto, .overflow-y-scroll, [class*="overflow-y-auto"], [class*="overflow-auto"], [class*="overflow-y-scroll"], [data-scroll-container="true"]'
  );

  scrollableElements.forEach((el) => {
    resetElement(el);
  });

  // Also query elements with max-h or style overflow
  const allDivs = container.querySelectorAll<HTMLElement>('div, form, section, main, article');
  allDivs.forEach((el) => {
    if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
      const style = window.getComputedStyle(el);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
        resetElement(el);
      }
    }
  });
}

/**
 * Ensures a modal/popup is visible in the viewport and its internal scroll areas are reset to top.
 */
export function ensureModalScrolledToTop(target: HTMLElement | string | null | undefined) {
  if (typeof window === 'undefined' || !target) return;

  const element = typeof target === 'string' ? (document.querySelector(target) as HTMLElement) : target;
  if (!element) return;

  const performReset = () => {
    resetInternalScrollContainersToTop(element);

    // If this is a fixed overlay, reset the overlay's own scroll if it has overflow-y-auto
    const fixedOverlay = element.closest('.fixed.inset-0, [class*="fixed"][class*="inset-0"]') as HTMLElement;
    if (fixedOverlay) {
      if (fixedOverlay.scrollTop !== 0) fixedOverlay.scrollTop = 0;
    }

    // Check if the modal / card is in viewport (if it's not a fixed inset-0 overlay or if it's an inline modal/card)
    const isFixedFullscreen = fixedOverlay || element.classList.contains('fixed') || window.getComputedStyle(element).position === 'fixed';
    
    if (!isFixedFullscreen) {
      const rect = element.getBoundingClientRect();
      const isPartiallyOutOfView =
        rect.top < 0 ||
        rect.bottom > window.innerHeight ||
        rect.left < 0 ||
        rect.right > window.innerWidth;

      if (isPartiallyOutOfView) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  };

  // Execute immediately, in the next animation frame, and after typical animation delays (50ms, 150ms)
  performReset();
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(performReset);
  }
  setTimeout(performReset, 50);
  setTimeout(performReset, 150);
}

/**
 * Checks whether an HTMLElement matches modal/popup/overlay patterns.
 */
function isModalOrOverlayElement(el: HTMLElement): boolean {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

  // Check role attributes
  const role = el.getAttribute('role');
  if (role === 'dialog' || role === 'alertdialog') return true;

  // Check class list and style
  const className = typeof el.className === 'string' ? el.className : '';
  const id = el.id || '';

  // Check fixed full-screen overlays
  if (
    className.includes('fixed') &&
    (className.includes('inset-0') || className.includes('top-0')) &&
    (className.includes('z-') || className.includes('backdrop-blur') || className.includes('bg-black') || className.includes('bg-slate'))
  ) {
    return true;
  }

  // Check id or data attributes naming patterns
  const lowerId = id.toLowerCase();
  const lowerClass = className.toLowerCase();

  if (
    lowerId.includes('modal') ||
    lowerId.includes('popup') ||
    lowerId.includes('dialog') ||
    lowerId.includes('drawer') ||
    lowerId.includes('overlay') ||
    lowerId.includes('_form') ||
    lowerId.includes('wizard')
  ) {
    return true;
  }

  if (
    lowerClass.includes('modal') ||
    lowerClass.includes('popup') ||
    lowerClass.includes('dialog') ||
    lowerClass.includes('drawer')
  ) {
    return true;
  }

  return false;
}

/**
 * Global Initializer that attaches MutationObserver to document.body.
 * Runs seamlessly and automatically on every React dashboard.
 */
let isGlobalModalViewportInitialized = false;

export function initGlobalModalViewportHandler() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (isGlobalModalViewportInitialized) return () => {};

  isGlobalModalViewportInitialized = true;

  const handleAddedOrUpdatedNode = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;

    // Check if the element itself is a modal/popup
    let targetModal: HTMLElement | null = null;
    if (isModalOrOverlayElement(el)) {
      targetModal = el;
    } else {
      // Or if it contains a modal/popup
      targetModal = el.querySelector<HTMLElement>(
        '[role="dialog"], [role="alertdialog"], .fixed.inset-0, [class*="fixed"][class*="inset-0"], [id*="modal" i], [id*="popup" i], [id*="dialog" i], [id*="drawer" i], [id*="_form"]'
      );
    }

    if (targetModal && !activeModalSet.has(targetModal)) {
      activeModalSet.add(targetModal);
      ensureModalScrolledToTop(targetModal);
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          handleAddedOrUpdatedNode(node);
        });
      } else if (mutation.type === 'attributes') {
        const target = mutation.target as HTMLElement;
        if (target && target.nodeType === Node.ELEMENT_NODE) {
          // If visibility / display changed
          if (
            mutation.attributeName === 'style' ||
            mutation.attributeName === 'class' ||
            mutation.attributeName === 'hidden' ||
            mutation.attributeName === 'open'
          ) {
            handleAddedOrUpdatedNode(target);
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'open', 'data-state'],
  });

  return () => {
    observer.disconnect();
    isGlobalModalViewportInitialized = false;
  };
}
