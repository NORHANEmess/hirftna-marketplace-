import { Star } from 'lucide-react';
import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────
// STAR RATING — Display only
// Usage: <StarRating rating={4.8} count={23} />
// ─────────────────────────────────────────────────────────────
export function StarRating({
    rating = 0,
    count,
    size = 'sm',
    showValue = true,
    className = '',
}) {
    const starSizes = { xs: 10, sm: 12, md: 14, lg: 16 };
    const starSize = starSizes[size] || 12;
    const rounded = Math.round(rating * 10) / 10;

    return (
        <div className={clsx('flex items-center gap-1', className)}>
            {/* Stars */}
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={starSize}
                        className={clsx(
                            star <= Math.round(rating)
                                ? 'fill-warning text-warning'
                                : 'fill-beige-300 text-beige-300'
                        )}
                    />
                ))}
            </div>

            {/* Value */}
            {showValue && rating > 0 && (
                <span className={clsx(
                    'font-medium text-warm-700',
                    size === 'xs' ? 'text-[9px]' : 'text-[10px]'
                )}>
                    {rounded.toFixed(1)}
                </span>
            )}

            {/* Count */}
            {count !== undefined && (
                <span className={clsx(
                    'text-warm-400',
                    size === 'xs' ? 'text-[9px]' : 'text-[10px]'
                )}>
                    ({count})
                </span>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// INTERACTIVE STAR RATING — for submitting reviews
// Usage: <InteractiveStarRating value={rating} onChange={setRating} />
// ─────────────────────────────────────────────────────────────
import { useState } from 'react';

export function InteractiveStarRating({
    value = 0,
    onChange,
    size = 28,
    disabled = false,
}) {
    const [hovered, setHovered] = useState(0);

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && onChange?.(star)}
                    onMouseEnter={() => !disabled && setHovered(star)}
                    onMouseLeave={() => !disabled && setHovered(0)}
                    className={clsx(
                        'transition-transform duration-100',
                        !disabled && 'hover:scale-110 cursor-pointer',
                        disabled && 'cursor-default'
                    )}
                    aria-label={`Rate ${star} stars`}
                >
                    <Star
                        size={size}
                        className={clsx(
                            'transition-colors duration-100',
                            star <= (hovered || value)
                                ? 'fill-warning text-warning'
                                : 'fill-beige-200 text-beige-300'
                        )}
                    />
                </button>
            ))}
        </div>
    );
}