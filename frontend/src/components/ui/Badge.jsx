import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────
// BADGE
// Usage: <Badge variant="sage">Verified</Badge>
// Variants: sage | cream | warning | danger | info | success
// ─────────────────────────────────────────────────────────────
const VARIANTS = {
    sage: 'bg-sage-100 text-sage-700 border-sage-200',
    cream: 'bg-cream-300 text-warm-700 border-beige-300',
    warning: 'bg-amber-50  text-amber-700 border-amber-200',
    danger: 'bg-red-50    text-red-700   border-red-200',
    info: 'bg-blue-50   text-blue-700  border-blue-200',
    success: 'bg-green-50  text-green-700 border-green-200',
    dark: 'bg-warm-800  text-cream-100 border-warm-700',
};

export function Badge({
    children,
    variant = 'cream',
    className = '',
    dot = false,
}) {
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                VARIANTS[variant],
                className
            )}
        >
            {dot && (
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            )}
            {children}
        </span>
    );
}

// ── Order Status Badge ─────────────────────────────────────────
const STATUS_MAP = {
    pending: { label: 'Pending Review', variant: 'warning' },
    accepted: { label: 'Accepted', variant: 'sage' },
    rejected: { label: 'Rejected', variant: 'danger' },
    completed: { label: 'Completed', variant: 'info' },
};

export function OrderStatusBadge({ status }) {
    const config = STATUS_MAP[status] || { label: status, variant: 'cream' };
    return (
        <Badge variant={config.variant} dot>
            {config.label}
        </Badge>
    );
}

// ── Verified Seller Badge ──────────────────────────────────────
export function VerifiedBadge() {
    return (
        <Badge variant="sage">
            ✓ Verified
        </Badge>
    );
}