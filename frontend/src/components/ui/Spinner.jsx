import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────
// SPINNER
// Usage: <Spinner size="sm" /> | <Spinner size="md" /> | <Spinner size="lg" />
// ─────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
    const sizes = {
        xs: 'w-3 h-3 border-[1.5px]',
        sm: 'w-4 h-4 border-2',
        md: 'w-6 h-6 border-2',
        lg: 'w-8 h-8 border-[3px]',
        xl: 'w-12 h-12 border-4',
    };

    return (
        <div
            className={clsx(
                'rounded-full border-beige-300 border-t-sage-500 animate-spin',
                sizes[size],
                className
            )}
            role="status"
            aria-label="Loading"
        />
    );
}

// Full-page loading state
export function PageLoader() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <p className="text-sm text-warm-400 animate-pulse">Loading...</p>
            </div>
        </div>
    );
}