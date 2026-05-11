import { useEffect, useRef } from 'react';

/**
 * Returns a ref that should be attached to the dialog "card" element. While
 * the dialog is open the hook:
 *   - focuses the first interactive element inside the card,
 *   - traps Tab / Shift+Tab inside the card,
 *   - closes the dialog when Escape is pressed.
 *
 * Each call site is responsible for adding role="dialog", aria-modal="true",
 * aria-labelledby + a stable header id to the card itself.
 */
const FOCUSABLE = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    'object',
    'embed',
    '[contenteditable]',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useDialogA11y(isOpen: boolean, onClose: () => void) {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const root = ref.current;
        if (!root) return;

        // Focus the first focusable element (or the dialog itself as a fallback).
        const initial = root.querySelector<HTMLElement>(FOCUSABLE);
        const id = window.setTimeout(() => (initial ?? root).focus(), 0);

        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
                return;
            }
            if (e.key !== 'Tab') return;
            const card = ref.current;
            if (!card) return;
            const focusables = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE))
                .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
            if (focusables.length === 0) {
                e.preventDefault();
                card.focus();
                return;
            }
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey) {
                if (active === first || !card.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }

        document.addEventListener('keydown', handleKey, true);
        return () => {
            window.clearTimeout(id);
            document.removeEventListener('keydown', handleKey, true);
        };
    }, [isOpen, onClose]);

    return ref;
}
