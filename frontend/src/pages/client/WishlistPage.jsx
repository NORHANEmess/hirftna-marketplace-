import { useState, useEffect } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extractApiItems, wishlistAPI } from '../../services/api';
// ProductCard works for both roles — no role check inside it anymore
import ProductCard, { ProductCardSkeleton } from '../../components/product/ProductCard';

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  const navigate = useNavigate();
  return (
    <div dir="rtl" className="text-center py-20 px-4">
      <div className="w-16 h-16 bg-cream-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
        <Heart size={26} className="text-warm-300" />
      </div>
      <p className="text-warm-800 font-semibold mb-1" style={{ fontFamily: "'Amiri', serif" }}>
        لا يوجد منتجات محفوظة بعد
      </p>
      <p className="text-warm-400 text-sm mb-6">
        اضغط على أيقونة القلب على أي منتج لحفظه هنا
      </p>
      <button
        onClick={() => navigate('/browse')}
        className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white
          text-sm font-semibold rounded-2xl hover:bg-sage-600 transition-colors"
      >
        <ShoppingBag size={15} />
        استعرض المنتجات
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WishlistPage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wishlistAPI.getAll()
      .then((res) => {
        const raw = extractApiItems(res);
        const products = raw.map(entry => entry.product ?? entry).filter(Boolean);
        setItems(products);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // When a product's heart is un-tapped from inside ProductCard,
  // remove it from the local grid immediately — no reload needed
  function handleWishlistToggle(product, newState) {
    if (!newState) {
      setItems(prev => prev.filter(p => p.id !== product.id));
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Sticky Header ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-danger" />
            <h1 className="text-lg font-bold text-warm-900" style={{ fontFamily: "'Amiri', serif" }}>
              المنتجات المحفوظة
            </h1>
            {/* Live count badge — only shown when items exist */}
            {!loading && items.length > 0 && (
              <span className="text-xs font-bold bg-danger/10 text-danger px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <p className="text-xs text-warm-400 mt-0.5">
            {loading
              ? '...'
              : `${items.length} ${items.length === 1 ? 'منتج محفوظ' : 'منتجات محفوظة'}`
            }
          </p>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                wishlisted={true}
                onWishlistToggle={handleWishlistToggle}
                showRequestBtn={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
