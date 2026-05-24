// ─────────────────────────────────────────────────────────────
// FORMAT PRICE
// Handles both single price and price ranges
// All prices in Algerian Dinar (DA)
// ─────────────────────────────────────────────────────────────

/**
 * Format a single price
 * @param {number} price
 * @param {string} currency - default 'DA'
 * @returns {string} e.g. "29 999 DA"
 */
export function formatPrice(price, currency = 'DA') {
    if (price === null || price === undefined) return '—';
    const num = Number(price);
    if (isNaN(num)) return '—';

    return `${num.toLocaleString('fr-DZ')} ${currency}`;
}

/**
 * Format a price range
 * @param {number} min
 * @param {number} max
 * @param {string} currency
 * @returns {string} e.g. "1 200 – 4 500 DA"
 */
export function formatPriceRange(min, max, currency = 'DA', t) {
    if (!min && !max) return '—';
    if (!max || min === max) {
        const fromLabel = t ? t('product.from', { price: Number(min).toLocaleString('fr-DZ') }) : `${Number(min).toLocaleString('fr-DZ')} ${currency}`;
        return fromLabel;
    }

    return `${Number(min).toLocaleString('fr-DZ')} – ${Number(max).toLocaleString('fr-DZ')} ${currency}`;
}

/**
 * Format product price for display
 * Uses price_min/price_max if available, falls back to price
 * @param {object} product - product object from API
 * @param {Function} t - i18n translation function (optional)
 * @returns {string}
 */
export function formatProductPrice(product, t) {
    if (!product) return '—';

    if (product.price_min && product.price_max) {
        return formatPriceRange(product.price_min, product.price_max, 'DA', t);
    }

    if (product.price_min) {
        return t ? t('product.from', { price: Number(product.price_min).toLocaleString('fr-DZ') }) : `${Number(product.price_min).toLocaleString('fr-DZ')} DA`;
    }

    if (product.price) {
        return t ? t('product.from', { price: Number(product.price).toLocaleString('fr-DZ') }) : `${Number(product.price).toLocaleString('fr-DZ')} DA`;
    }

    return '—';
}

// ─────────────────────────────────────────────────────────────
// FORMAT DATE
// ─────────────────────────────────────────────────────────────

/**
 * Format a date string to human readable
 * @param {string} dateStr - ISO date string
 * @param {object} options
 * @returns {string}
 */
export function formatDate(dateStr, options = {}) {
    if (!dateStr) return '—';

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';

    const {
        style = 'medium', // 'short' | 'medium' | 'long'
        locale = 'en-GB',
        lang = null,
    } = options;

    const resolvedLocale = lang ? (lang === 'ar' ? 'ar-DZ' : 'en-GB') : locale;

    const formats = {
        short: { month: 'short', day: 'numeric' },
        medium: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
    };

    return date.toLocaleDateString(resolvedLocale, formats[style] || formats.medium);
}

/**
 * Format relative time (e.g. "2 hours ago", "3 days ago")
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
export function formatRelativeTime(dateStr, t = null, lang = null) {
    if (!dateStr) return '—';

    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date; // ms

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (t) {
        if (seconds < 60) return t('common.justNow');
        if (minutes < 60) return t('common.minutesAgo', { count: minutes });
        if (hours < 24) return t('common.hoursAgo', { count: hours });
        if (days < 7) return t('common.daysAgo', { count: days });
        if (weeks < 4) return t('common.weeksAgo', { count: weeks });
        if (months < 12) return t('common.monthsAgo', { count: months });
    } else {
        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        if (weeks < 4) return `${weeks}w ago`;
        if (months < 12) return `${months}mo ago`;
    }

    return formatDate(dateStr, { style: 'short', lang });
}

/**
 * Format deadline date with urgency indicator
 * @param {string} dateStr
 * @returns {{ label: string, urgent: boolean }}
 */
export function formatDeadline(dateStr) {
    if (!dateStr) return { label: '—', urgent: false };

    const date = new Date(dateStr);
    const now = new Date();
    const daysLeft = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return { label: 'Overdue', urgent: true };
    if (daysLeft === 0) return { label: 'Today', urgent: true };
    if (daysLeft === 1) return { label: 'Tomorrow', urgent: true };
    if (daysLeft < 7) return { label: `${daysLeft}d left`, urgent: true };

    return { label: formatDate(dateStr, { style: 'medium' }), urgent: false };
}