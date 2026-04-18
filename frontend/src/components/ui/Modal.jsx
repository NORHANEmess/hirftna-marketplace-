import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────
// MODAL
// Usage:
//   <Modal isOpen={open} onClose={() => setOpen(false)} title="Request Custom Order">
//     <p>content</p>
//   </Modal>
// ─────────────────────────────────────────────────────────────
export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showClose = true,
    className = '',
}) {
    const panelRef = useRef(null);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-full mx-4',
    };

    return (
        // Backdrop
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-warm-900/40 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel — slides up from bottom on mobile, scales in on desktop */}
            <div
                ref={panelRef}
                className={clsx(
                    'relative w-full bg-white shadow-soft-xl z-10',
                    // Mobile: full-width bottom sheet with rounded top
                    'rounded-t-3xl sm:rounded-3xl',
                    // Desktop: constrained width
                    `sm:${sizeClasses[size] || sizeClasses.md}`,
                    'animate-slide-up',
                    className
                )}
            >
                {/* Header */}
                {(title || showClose) && (
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-beige-100">
                        {/* Drag handle for mobile */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-beige-300 rounded-full sm:hidden" />

                        {title && (
                            <h2
                                id="modal-title"
                                className="text-base font-semibold text-warm-900"
                            >
                                {title}
                            </h2>
                        )}
                        {showClose && (
                            <button
                                onClick={onClose}
                                className="ml-auto flex items-center justify-center w-8 h-8 rounded-full hover:bg-cream-200 transition-colors text-warm-400 hover:text-warm-700"
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="px-5 py-4 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ── Confirm Modal ──────────────────────────────────────────────
export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
}) {
    const confirmClasses = {
        danger: 'btn-danger',
        primary: 'btn-primary',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            {message && (
                <p className="text-sm text-warm-600 mb-5 leading-relaxed">{message}</p>
            )}
            <div className="flex gap-3">
                <button
                    onClick={onClose}
                    className="btn btn-secondary flex-1"
                >
                    {cancelLabel}
                </button>
                <button
                    onClick={() => { onConfirm(); onClose(); }}
                    className={clsx('btn flex-1', confirmClasses[variant] || 'btn-primary')}
                >
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
}