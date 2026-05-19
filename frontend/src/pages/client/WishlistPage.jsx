import { useState, useEffect } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extractApiItems, wishlistAPI } from '../../services/api';
import Toast from '../../components/ui/Toast';
import ProductCard, { ProductCardSkeleton } from '../../components/product/ProductCard';
import { useTranslation } from '../../i18n/index.jsx';

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="text-center py-20 px-4">
      <div className="w-16 h-16 bg-cream-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
        <Heart size={26} className="text-warm-300" />
      </div>
      <p className="text-warm-800 font-semibold mb-1">
        {t('wishlist.empty')}
      </p>
      <p className="text-warm-400 text-sm mb-6">
        {t('wishlist.emptySub')}
      </p>
      <button
        onClick={() => navigate('/browse')}
        className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white
          text-sm font-semibold rounded-2xl hover:bg-sage-600 transition-colors"
      >
        <ShoppingBag size={15} />
        {t('wishlist.discover')}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WishlistPage() {
  const { t } = useTranslation();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);

  useEffect(() => {
    wishlistAPI.getAll()
      .then((res) => {
        const raw = extractApiItems(res);
        const products = raw.map(entry => entry.product).filter(Boolean);
        setItems(products);
      })
      .catch(() => {
        setItems([]);
        setToast({ message: t('common.error'), type: 'error' });
      })
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
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Page Header ── */}
      <div className="px-4 md:px-6 lg:px-8 pt-5 pb-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-0.5">
            <Heart size={18} className="text-danger" />
            <h1 className="text-2xl font-bold text-warm-800">
              {t('wishlist.title')}
            </h1>
            {!loading && items.length > 0 && (
              <span className="text-xs font-bold bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <p className="text-sm text-warm-400">
            {loading
              ? '...'
              : `${items.length} ${items.length === 1 ? t('wishlist.count_one') : t('wishlist.count_other')}`
            }
          </p>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 pb-5">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
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

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
