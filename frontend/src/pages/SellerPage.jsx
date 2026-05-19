import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Calendar, BadgeCheck, Star, Package, Clock, ChevronLeft, TrendingUp, Tag } from 'lucide-react';
import { extractApiEntity, extractApiItems, reviewsAPI, sellersAPI } from '../services/api';
import ProductGrid from '../components/product/ProductGrid';
import { StarRating } from '../components/ui/StarRating';
import { Spinner } from '../components/ui/Spinner';
import { formatDate, formatRelativeTime } from '../utils/formatPrice';
import { useTranslation } from '../i18n/index.jsx';
import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────
// REVIEW ITEM (seller reviews)
// ─────────────────────────────────────────────────────────────
function ReviewItem({ review }) {
  const { t } = useTranslation();
  return (
    <div className="py-4 border-b border-beige-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          {review.client?.avatar_url ? (
            <img
              src={review.client.avatar_url}
              alt={review.client.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sage-300 to-sage-500 flex items-center justify-center text-white text-xs font-bold">
              {review.client?.full_name?.charAt(0) || '?'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-warm-800">
              {review.client?.full_name || t('seller.clientFallback')}
            </p>
            <StarRating rating={review.rating} size="xs" showValue={false} />
          </div>
          <p className="text-[10px] text-warm-400 mb-1.5">
            {formatRelativeTime(review.created_at, t)}
          </p>
          {review.comment && (
            <p className="text-sm text-warm-600 leading-relaxed">{review.comment}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SELLER PAGE — public profile
// ─────────────────────────────────────────────────────────────
export default function SellerPage() {
  const { t } = useTranslation();
  const { id }              = useParams();
  const navigate            = useNavigate();

  const [seller,    setSeller]    = useState(null);
  const [products,  setProducts]  = useState([]);
  const [reviews,   setReviews]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sellerRes, revRes] = await Promise.all([
          sellersAPI.getById(id),
          reviewsAPI.getSellerRatings(id, { limit: 10 }),
        ]);
        const sellerData = extractApiEntity(sellerRes, 'seller');
        setSeller(sellerData);
        setProducts(extractApiItems(sellerRes, { itemKeys: ['products'] }));
        setReviews(extractApiItems(revRes, { itemKeys: ['ratings', 'reviews'] }));
      } catch {
        navigate('/browse');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!seller) return null;

  const avgRating    = Number(seller.avg_rating || 0);
  const totalSales   = seller.total_sales || 0;
  const productCount = products.length;
  const reviewCount  = reviews.length;

  const tabs = [
    { key: 'products', label: `${t('seller.tabs.products')} (${productCount})` },
    { key: 'story',    label: t('seller.tabs.story')                           },
    { key: 'reviews',  label: `${t('seller.tabs.reviews')} (${reviewCount})`  },
  ];

  return (
    <div className="min-h-screen bg-cream-100">

      {/* ── BACK ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-warm-500 hover:text-warm-800 transition-colors"
        >
          <ChevronLeft size={16} /> {t('common.back')}
        </button>
      </div>

      {/* ── PROFILE HEADER ─────────────────────────────────────── */}
      <div className="bg-white border-b border-beige-200 mt-2">
        {/* Cover area */}
        <div className="h-24 lg:h-32 bg-sage-50" />

        {/* Profile content */}
        <div className="px-4 pb-5">
          {/* Avatar overlapping cover */}
          <div className="-mt-10 mb-3">
            {seller.avatar_url ? (
              <img
                src={seller.avatar_url}
                alt={seller.shop_name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sage-400 to-sage-600 border-4 border-white shadow-md flex items-center justify-center text-white text-3xl font-bold">
                {seller.shop_name?.charAt(0) || 'A'}
              </div>
            )}
          </div>

          {/* Shop name + verified badge */}
          <div className="flex items-start gap-2 flex-wrap mb-2">
            <h1 className="text-2xl font-bold text-warm-800 leading-tight">{seller.shop_name}</h1>
            {seller.is_verified && (
              <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-sage-600">
                <BadgeCheck size={13} className="text-sage-500" /> {t('seller.verified')}
              </span>
            )}
          </div>

          {/* Info row: location · category · since */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-warm-400 mb-2">
            {seller.location && (
              <span className="flex items-center gap-1"><MapPin size={12} /> {seller.location}</span>
            )}
            {seller.category?.name && (
              <span className="flex items-center gap-1.5">
                <Tag size={12} />
                <span className="bg-sage-50 text-sage-600 rounded-full px-2 py-0.5 font-medium">{t(`categories.${seller.category.name}`, seller.category.name)}</span>
              </span>
            )}
            {seller.created_at && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {t('seller.since', { date: formatDate(seller.created_at, { style: 'short' }) })}
              </span>
            )}
          </div>

          {/* Response time */}
          <div className="flex items-center gap-1.5 text-xs text-warm-400 mb-5">
            <Clock size={12} className="text-brick-400" />
            <span>{t('seller.responseTime')}</span>
          </div>

          {/* Stats grid — 3 cards with icons */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-cream-50 rounded-xl p-3 text-center border border-beige-100/50">
              <Package size={18} className="text-sage-400 mx-auto mb-1" />
              <p className={`text-xl font-bold ${productCount > 0 ? 'text-warm-800' : 'text-warm-300'}`}>
                {productCount > 0 ? productCount : '—'}
              </p>
              <p className="text-[10px] text-warm-400 mt-0.5">{t('seller.products')}</p>
            </div>
            <div className="bg-cream-50 rounded-xl p-3 text-center border border-beige-100/50">
              <Star size={18} className="text-sage-400 mx-auto mb-1" />
              <p className={`text-xl font-bold ${avgRating > 0 ? 'text-warm-800' : 'text-warm-300'}`}>
                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
              </p>
              <p className="text-[10px] text-warm-400 mt-0.5">{t('seller.rating')}</p>
            </div>
            <div className="bg-cream-50 rounded-xl p-3 text-center border border-beige-100/50">
              <TrendingUp size={18} className="text-sage-400 mx-auto mb-1" />
              <p className={`text-xl font-bold ${totalSales > 0 ? 'text-warm-800' : 'text-warm-300'}`}>
                {totalSales > 0 ? totalSales : '—'}
              </p>
              <p className="text-[10px] text-warm-400 mt-0.5">{t('seller.sales')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────── */}
      <div className="flex border-b border-beige-200 bg-white px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 py-3 text-xs transition-all border-b-[3px] -mb-px',
              activeTab === tab.key
                ? 'border-sage-500 text-sage-600 font-semibold'
                : 'border-transparent text-warm-400 font-medium hover:text-warm-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ───────────────────────────────────────── */}
      <div className="px-4 py-6">

        {/* Products tab */}
        {activeTab === 'products' && (
          <ProductGrid
            products={products}
            loading={false}
            onRequestOrder={(product) =>
              navigate(`/products/${product.id}?action=request`)
            }
            emptyMessage={t('seller.products_empty')}
            emptySubMessage={t('seller.productsEmptySub')}
          />
        )}

        {/* Story tab */}
        {activeTab === 'story' && (
          <div className="max-w-lg mx-auto">
            {seller.story ? (
              <div className="prose-sm text-warm-700 leading-relaxed space-y-4">
                {seller.story.split('\n\n').map((para, i) => {
                  if (para.startsWith('## ')) {
                    return (
                      <h2 key={i} className="text-base font-bold text-warm-900 mt-5 mb-2">
                        {para.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (para.startsWith('### ')) {
                    return (
                      <h3 key={i} className="text-sm font-semibold text-sage-600 mt-4 mb-1">
                        {para.replace('### ', '')}
                      </h3>
                    );
                  }
                  return (
                    <p key={i} className="text-sm text-warm-600 leading-relaxed">
                      {para}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <Package size={32} className="text-warm-300 mx-auto mb-3" />
                <p className="text-sm text-warm-500">{t('seller.story.empty')}</p>
              </div>
            )}
          </div>
        )}

        {/* Reviews tab */}
        {activeTab === 'reviews' && (
          <div>
            {reviewCount === 0 ? (
              <div className="text-center py-10">
                <Star size={32} className="text-warm-300 mx-auto mb-3" />
                <p className="text-sm text-warm-500">{t('seller.reviews.empty')}</p>
              </div>
            ) : (
              <>
                {/* Rating summary */}
                <div className="bg-white rounded-2xl p-4 border border-beige-200 mb-4 flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-warm-900">
                      {avgRating.toFixed(1)}
                    </p>
                    <StarRating rating={avgRating} size="sm" showValue={false} className="justify-center" />
                    <p className="text-[10px] text-warm-400 mt-1">
                      {t('seller.reviews.count', { count: reviewCount })}
                    </p>
                  </div>
                </div>
                {reviews.map((r) => <ReviewItem key={r.id} review={r} />)}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
