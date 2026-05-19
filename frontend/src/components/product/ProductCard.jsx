/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, Package, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { wishlistAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/index.jsx';

// ─── Price formatter ──────────────────────────────────────────────────────────
export function formatProductPrice(product, t = null) {
  const min  = product.price_min ?? null;
  const max  = product.price_max ?? null;
  const base = product.price     ?? null;
  const fmt  = (n) => Number(n).toLocaleString();

  if (min !== null && max !== null && min !== undefined && max !== undefined) {
    const lower = Math.min(Number(min), Number(max));
    const upper = Math.max(Number(min), Number(max));
    return `${fmt(lower)} – ${fmt(upper)} DA`;
  }

  if (t) {
    if (min)  return t('product.from', { price: fmt(min) });
    if (base) return t('product.from', { price: fmt(base) });
    return t('product.priceOnRequest');
  }

  if (min)  return `${fmt(min)} DA`;
  if (base) return `${fmt(base)} DA`;
  return '—';
}

// ─── Skeleton placeholder ─────────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden animate-pulse">
      <div className="aspect-[4/5] bg-beige-200" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-2.5 bg-beige-200 rounded-full w-16" />
        <div className="h-3 bg-beige-200 rounded-full w-full" />
        <div className="h-3 bg-beige-200 rounded-full w-3/4" />
        <div className="h-4 bg-beige-200 rounded-full w-24 mt-1" />
        <div className="h-9 bg-beige-200 rounded-xl mt-2" />
      </div>
    </div>
  );
}

// ─── Main ProductCard ─────────────────────────────────────────────────────────
/**
 * Props:
 *   product          — full product object from the API
 *   wishlisted       — controlled boolean (optional)
 *   onWishlistToggle — callback(product, newState)
 *   showRequestBtn   — whether to show the "Request Custom Order" CTA
 *   isPromoted       — show promoted badge
 *   compact          — compact mode (smaller image, no CTA) for narrow grids
 */
export default function ProductCard({
  product,
  wishlisted: wishlistedProp = false,
  onWishlistToggle,
  showRequestBtn = true,
  isPromoted = false,
  compact = false,
}) {
  const navigate            = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t }               = useTranslation();

  const [wishlisted,  setWishlisted]  = useState(wishlistedProp);
  const [wishLoading, setWishLoading] = useState(false);
  const [heartPulse,  setHeartPulse]  = useState(false);
  const [imgError,    setImgError]    = useState(false);

  const image      = product.product_images?.[0]?.image_url ?? product.image_url ?? null;
  const sellerName = product.seller?.shop_name   ?? product.sellers?.shop_name   ?? null;
  const isVerified = product.seller?.is_verified ?? product.sellers?.is_verified ?? false;
  const priceStr   = formatProductPrice(product, t);
  const catName    = product.categories?.name ?? product.category?.name ?? null;

  const badges = [];
  if (isPromoted)          badges.push({ label: t('product.badge.promoted'), cls: 'bg-sage-500 text-white' });
  if (product.is_new)      badges.push({ label: t('product.badge.new'),      cls: 'bg-brick-50 text-brick-600 border border-brick-200' });
  if (product.is_featured) badges.push({ label: t('product.badge.featured'), cls: 'bg-warning text-white' });

  async function handleWishlist(e) {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }

    const next = !wishlisted;
    setWishlisted(next);
    setHeartPulse(true);
    setTimeout(() => setHeartPulse(false), 350);
    setWishLoading(true);

    try {
      if (next) await wishlistAPI.add(product.id);
      else      await wishlistAPI.remove(product.id);
      onWishlistToggle?.(product, next);
    } catch {
      setWishlisted(!next);
    } finally {
      setWishLoading(false);
    }
  }

  function handleRequest(e) {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    window.dispatchEvent(new CustomEvent('open-order-form', { detail: { product } }));
  }

  return (
    <div
      onClick={() => navigate(`/products/${product.id}`)}
      className="group bg-white rounded-2xl border border-beige-100/70 overflow-hidden cursor-pointer hover-lift flex flex-col"
    >
      {/* ── Image zone ── */}
      <div className={`relative bg-cream-200 overflow-hidden flex-shrink-0 ${compact ? 'aspect-square' : 'aspect-[4/5]'}`}>
        {image && !imgError ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-beige-100">
            <Package size={32} className="text-beige-300" />
          </div>
        )}

        {/* Product badges — top left */}
        {badges.length > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
            {badges.map(b => (
              <span key={b.label} className={`text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm ${b.cls}`}>
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* Completion days badge — top right (pushed left for heart) */}
        {product.completion_days && (
          <div className="absolute top-2.5 right-10 bg-white/90 backdrop-blur-sm
            text-[9px] font-semibold text-warm-600 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
            <Clock size={9} />
            {t('product.daysShort', { days: product.completion_days })}
          </div>
        )}

        {/* Heart / Wishlist button — 44px tap area */}
        <button
          onClick={handleWishlist}
          disabled={wishLoading}
          aria-label={wishlisted ? t('wishlist.remove') : t('wishlist.save')}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center
            justify-center shadow-sm transition-all duration-200 disabled:opacity-50
            bg-white/90 backdrop-blur-sm hover:bg-white
            ${wishlisted ? 'text-brick-500' : 'text-warm-400 hover:text-brick-500'}`}
        >
          <Heart
            size={14}
            className={`${wishlisted ? 'fill-brick-500' : ''} ${heartPulse ? 'animate-heart-beat' : ''}`}
          />
        </button>
      </div>

      {/* ── Text info zone (4 layers: category / name / seller+rating / price) ── */}
      <div className={`flex flex-col flex-1 ${compact ? 'p-2.5 gap-1' : 'p-3.5'}`}>

        {/* Layer 1: Category */}
        {catName && (
          <p className={`font-medium uppercase text-sage-500 ${compact ? 'text-[8px]' : 'text-[11px] tracking-[0.08em] mb-1'}`}>
            {t(`categories.${catName}`, catName)}
          </p>
        )}

        {/* Layer 2: Product name */}
        <p className={`font-semibold text-warm-800 leading-snug line-clamp-2 ${compact ? 'text-xs mb-1' : 'text-[15px] mb-2'}`}>
          {product.name}
        </p>

        {/* Layer 3: Seller + rating — single truncated row with separator */}
        {!compact && (sellerName || product.avg_rating > 0) && (
          <div className="flex items-center gap-1.5 text-xs text-warm-400 overflow-hidden whitespace-nowrap border-b border-beige-100/80 pb-3 mb-0">
            {sellerName && <span className="truncate">{sellerName}</span>}
            {isVerified && <CheckCircle2 size={9} className="text-sage-500 flex-shrink-0" />}
            {sellerName && product.avg_rating > 0 && <span className="flex-shrink-0 text-warm-300">·</span>}
            {product.avg_rating > 0 && (
              <>
                <Star size={9} className="text-warning fill-warning flex-shrink-0" />
                <span className="font-semibold text-warm-700 flex-shrink-0">{Number(product.avg_rating).toFixed(1)}</span>
              </>
            )}
          </div>
        )}
        {compact && (sellerName || product.avg_rating > 0) && (
          <div className="flex items-center justify-between gap-1">
            {sellerName && (
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[10px] text-warm-400 truncate">{sellerName}</span>
                {isVerified && <CheckCircle2 size={9} className="text-sage-500 flex-shrink-0" />}
              </div>
            )}
            {product.avg_rating > 0 && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star size={9} className="text-warning fill-warning" />
                <span className="text-[10px] font-semibold text-warm-700">{Number(product.avg_rating).toFixed(1)}</span>
              </div>
            )}
          </div>
        )}

        {/* Layer 4: Price */}
        <p className={`font-bold mt-auto ${compact ? 'text-xs pt-0.5 text-warm-800' : 'text-lg pt-3 text-warm-800'}`}>
          {priceStr}
        </p>

        {/* CTA — hidden in compact mode */}
        {showRequestBtn && !compact && product.is_active !== false && (
          <button
            onClick={handleRequest}
            className="mt-1 w-full py-2.5 bg-sage-500 hover:bg-sage-600 text-white
              text-xs font-semibold rounded-xl transition-colors active:scale-[0.97]
              flex items-center justify-center gap-1.5"
          >
            {t('product.requestOrder')}
            <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
