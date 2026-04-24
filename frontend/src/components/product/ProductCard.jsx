/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Star, CheckCircle2, Clock } from 'lucide-react';
import { wishlistAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Price formatter ──────────────────────────────────────────────────────────
// Exported so ProductPage can import and reuse the exact same logic
export function formatProductPrice(product) {
  const min  = product.price_min ?? null;
  const max  = product.price_max ?? null;
  const base = product.price     ?? null;

  if (min && max)  return `${Number(min).toLocaleString()} – ${Number(max).toLocaleString()} DA`;
  if (min)         return `من ${Number(min).toLocaleString()} DA`;
  if (base)        return `من ${Number(base).toLocaleString()} DA`;
  return 'السعر عند الطلب';
}

// ─── Skeleton placeholder ─────────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden animate-pulse">
      <div className="aspect-square bg-beige-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-beige-200 rounded-full w-20" />
        <div className="h-3 bg-beige-200 rounded-full w-full" />
        <div className="h-3 bg-beige-200 rounded-full w-3/4" />
        <div className="h-8 bg-beige-200 rounded-xl mt-2" />
      </div>
    </div>
  );
}

// ─── Main ProductCard ─────────────────────────────────────────────────────────
/**
 * WISHLIST FIX:
 * The heart button is now available to ALL authenticated users — both clients
 * and sellers. Sellers are also buyers on this platform (per Project Brain §2.3),
 * so they must be able to save products from other sellers to their wishlist.
 *
 * The only check is `isAuthenticated`. Role is irrelevant here.
 *
 * Props:
 *   product          — full product object from the API
 *   wishlisted       — controlled boolean (optional, defaults to false)
 *   onWishlistToggle — callback(product, newState) so the parent can react
 *   showRequestBtn   — whether to show the "طلب مخصص" CTA button
 */
export default function ProductCard({
  product,
  wishlisted: wishlistedProp = false,
  onWishlistToggle,
  showRequestBtn = true,
}) {
  const navigate            = useNavigate();
  const { isAuthenticated } = useAuth();
  // NOTE: isSeller is intentionally NOT checked here.
  // Sellers can wishlist products just like clients can.

  const [wishlisted,   setWishlisted]   = useState(wishlistedProp);
  const [wishLoading,  setWishLoading]  = useState(false);

  // ── Derived display values ──
  const image      = product.product_images?.[0]?.image_url ?? product.image_url ?? null;
  const sellerName = product.seller?.shop_name   ?? product.sellers?.shop_name   ?? null;
  const isVerified = product.seller?.is_verified ?? product.sellers?.is_verified ?? false;
  const priceStr   = formatProductPrice(product);

  const badges = [];
  if (product.is_new)      badges.push({ label: 'جديد',     cls: 'bg-sage-600 text-white' });
  if (product.is_featured) badges.push({ label: 'مميز',     cls: 'bg-warning text-white'  });

  // ── Wishlist toggle ──
  // Available to ALL authenticated users — client or seller, doesn't matter.
  async function handleWishlist(e) {
    e.stopPropagation(); // Don't trigger the card's navigate()
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const next = !wishlisted;
    setWishlisted(next); // Optimistic update for instant feedback
    setWishLoading(true);

    try {
      if (next) {
        await wishlistAPI.add(product.id);
      } else {
        await wishlistAPI.remove(product.id);
      }
      onWishlistToggle?.(product, next);
    } catch {
      // Revert if API call fails so the UI stays truthful
      setWishlisted(!next);
    } finally {
      setWishLoading(false);
    }
  }

  // ── Custom order request ──
  // Fires the CustomEvent that CustomOrderForm listens for at root layout level
  function handleRequest(e) {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    window.dispatchEvent(
      new CustomEvent('open-order-form', { detail: { product } })
    );
  }

  return (
    <div
      onClick={() => navigate(`/products/${product.id}`)}
      className="group bg-white rounded-2xl border border-beige-200 overflow-hidden
        cursor-pointer hover:shadow-md hover:border-sage-200 hover:-translate-y-0.5
        transition-all duration-200 flex flex-col"
    >
      {/* ── Image zone ── */}
      <div className="relative aspect-square bg-cream-200 overflow-hidden flex-shrink-0">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">
            🧶
          </div>
        )}

        {/* Product badges — top left */}
        {badges.length > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
            {badges.map(b => (
              <span key={b.label}
                className={`text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm ${b.cls}`}>
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* Completion days badge — top right, pushed left to avoid heart */}
        {product.completion_days && (
          <div className="absolute top-2.5 right-9 bg-white/90 backdrop-blur-sm
            text-[9px] font-semibold text-warm-600 px-2 py-0.5 rounded-md flex items-center gap-1">
            <Clock size={9} />
            {product.completion_days}د
          </div>
        )}

        {/* ── Heart / Wishlist button ──
            Available to ALL authenticated users.
            If not authenticated → redirects to /login.
            Role is never checked here. */}
        <button
          onClick={handleWishlist}
          disabled={wishLoading}
          aria-label={wishlisted ? 'إزالة من المحفوظات' : 'حفظ في المفضلة'}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center
            justify-center shadow-sm transition-all duration-200 disabled:opacity-50
            ${wishlisted
              ? 'bg-danger text-white'
              : 'bg-white/90 backdrop-blur-sm text-warm-400 hover:text-danger hover:bg-white'
            }`}
        >
          <Heart size={13} className={wishlisted ? 'fill-white' : ''} />
        </button>
      </div>

      {/* ── Text info zone ── */}
      <div dir="rtl" className="p-3 flex flex-col gap-1.5 flex-1">

        {/* Seller name + verification tick */}
        {sellerName && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-warm-500 truncate">{sellerName}</span>
            {isVerified && (
              <CheckCircle2 size={10} className="text-sage-500 flex-shrink-0" />
            )}
          </div>
        )}

        {/* Star rating */}
        {product.avg_rating > 0 && (
          <div className="flex items-center gap-1">
            <Star size={10} className="text-warning fill-warning" />
            <span className="text-[10px] font-semibold text-warm-700">
              {Number(product.avg_rating).toFixed(1)}
            </span>
            {product.review_count > 0 && (
              <span className="text-[10px] text-warm-400">({product.review_count})</span>
            )}
          </div>
        )}

        {/* Product name */}
        <p className="text-sm font-semibold text-warm-900 leading-snug line-clamp-2 flex-1">
          {product.name}
        </p>

        {/* Category label */}
        {product.categories?.name && (
          <p className="text-[10px] text-warm-400">
            {product.categories.name_ar ?? product.categories.name}
          </p>
        )}

        {/* Price */}
        <p className="text-sm font-bold text-warm-900">{priceStr}</p>

        {/* "Request Custom Order" CTA — only shown when product is active */}
        {showRequestBtn && product.is_active !== false && (
          <button
            onClick={handleRequest}
            className="mt-1 w-full py-2 bg-sage-500 hover:bg-sage-600 text-white
              text-xs font-semibold rounded-xl transition-colors active:scale-[0.97]"
          >
            طلب مخصص
          </button>
        )}
      </div>
    </div>
  );
}
