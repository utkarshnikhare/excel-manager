import { useEffect, useRef } from 'react';

/**
 * useModalFocus Hook
 * 
 * Provides accessible focus management for modal dialogs (WCAG 2.1 AA):
 * 1. Captures trigger element on open and restores focus on close.
 * 2. Sets initial focus inside the modal dialog.
 * 3. Traps Tab and Shift+Tab navigation strictly within the modal.
 * 4. Dismisses the modal upon Escape key.
 * 
 * @param {Object} options
 * @param {React.RefObject} options.modalRef - Reference to the modal dialog DOM element.
 * @param {Function} options.onClose - Callback triggered to close the modal.
 * @param {React.RefObject} [options.initialFocusRef] - Optional element to receive initial focus.
 */
export function useModalFocus({ modalRef, onClose, initialFocusRef }) {
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    // 1. Record the element that triggered the modal for focus restoration
    previousActiveElementRef.current = document.activeElement;

    // 2. Initial Focus Entry into modal
    const focusTimer = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    });

    // 3. Tab focus trap & Escape key dismissal
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => {
          // Ensure element is visible and interactive
          return el.offsetParent !== null || el.getClientRects().length > 0;
        });

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: if on first element or outside, cycle to last element
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: if on last element or outside, cycle to first element
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 4. Cleanup & Focus Restoration
    return () => {
      cancelAnimationFrame(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);

      const previousElement = previousActiveElementRef.current;
      if (previousElement && typeof previousElement.focus === 'function' && document.body.contains(previousElement)) {
        requestAnimationFrame(() => {
          previousElement.focus();
        });
      }
    };
  }, [modalRef, onClose, initialFocusRef]);
}
