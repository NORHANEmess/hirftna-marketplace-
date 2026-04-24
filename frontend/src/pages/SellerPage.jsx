import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Calendar, BadgeCheck, Star, Package, TrendingUp, Clock, ChevronLeft } from 'lucide-react';
import { extractApiEntity, extractApiItems, reviewsAPI, sellersAPI } from '../services/api';
import ProductGrid from '../components/product/ProductGrid';
import { StarRating } from '../components/ui/StarRating';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { formatDate, formatRelativeTime } from '../utils/formatPrice';
import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────
function StatCard({ icon, value, label }) {
  const Icon = icon;
  return (
    <div className="bg-white rounded-2xl p-3 border border-beige-200 text-center flex-1">
      <Icon size={15} className="text-sage-500 mx-auto mb-1" />
      <p className="text-lg font-bold text-warm-900 leading-tight">{value}</p>
      <p className="text-[9px] text-warm-400 leading-tight">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REVIEW ITEM (seller reviews)
// ─────────────────────────────────────────────────────────────
function ReviewItem({ review }) {
  return (
    <div className="py-4 border-b border-beige-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-300 to-sage-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {review.client?.full_name?.charAt(0) || 'C'}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-warm-800">
              {review.client?.full_name || 'Client'}
            </p>
            <StarRating rating={review.rating} size="xs" showValue={false} />
          </div>
          <p className="text-[10px] text-warm-400 mb-1.5">
            {formatRelativeTime(review.created_at)}
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

  const avgRating   = Number(seller.avg_rating || 0);
  const totalSales  = seller.total_sales || 0;
  const productCount = products.length;
  const reviewCount  = reviews.length;

  const tabs = [
    { key: 'products', label: `Products (${productCount})` },
    { key: 'story',    label: 'Our Story'                  },
    { key: 'reviews',  label: `Reviews (${reviewCount})`   },
  ];

  return (
    <div className="min-h-screen bg-cream-100">

      {/* ── BACK ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-warm-500 hover:text-warm-800 transition-colors"
        >
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      {/* ── COVER IMAGE ───────────────────────────────────────── */}
      <div className="relative h-40 mx-3 mt-2 rounded-3xl overflow-hidden bg-gradient-to-br from-sage-400 to-sage-700">
        {seller.cover_url && (
          <img src={seller.cover_url} alt="Shop cover" className="w-full h-full object-cover" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
      </div>

      {/* ── PROFILE HEADER ─────────────────────────────────────── */}
      <div className="px-4 -mt-10 mb-4 relative z-10">
        <div className="flex items-end gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {seller.avatar_url ? (
              <img
                src={seller.avatar_url}
                alt={seller.shop_name}
                className="w-20 h-20 rounded-3xl object-cover border-4 border-white shadow-soft-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sage-400 to-sage-600 border-4 border-white shadow-soft-md flex items-center justify-center text-white text-3xl font-bold">
                {seller.shop_name?.charAt(0) || 'A'}
              </div>
            )}
            {seller.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-sage-500 rounded-full border-2 border-white flex items-center justify-center">
                <BadgeCheck size={14} className="text-white" />
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white drop-shadow-sm leading-tight">
                {seller.shop_name}
              </h1>
              {seller.is_verified && (
                <Badge variant="sage" className="text-[9px]">✓ Verified</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-warm-500">
          {seller.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {seller.location}
            </span>
          )}
          {seller.created_at && (
            <span className="flex items-center gap-1">
              <Calendar size={11} /> Since {formatDate(seller.created_at, { style: 'short' })}
            </span>
          )}
          {seller.category?.name && (
            <Badge variant="cream">{seller.category.name}</Badge>
          )}
        </div>

        {/* Response time */}
        <div className="mt-2 flex items-center gap-1.5 bg-sage-50 border border-sage-100 rounded-xl px-3 py-1.5 w-fit">
          <Clock size={12} className="text-sage-500" />
          <span className="text-xs text-sage-700 font-medium">Usually responds within 2 hours</span>
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <div className="flex gap-2 px-4 mb-4">
        <StatCard icon={Package}   value={productCount}                        label="Products"     />
        <StatCard icon={Star}      value={avgRating > 0 ? avgRating.toFixed(1) : '—'} label="Rating" />
        <StatCard icon={TrendingUp} value={totalSales > 0 ? totalSales : '—'}  label="Sales"        />
      </div>

      {/* ── TABS ──────────────────────────────────────────────── */}
      <div className="flex border-b border-beige-200 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-sage-500 text-sage-600'
                : 'border-transparent text-warm-400 hover:text-warm-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ───────────────────────────────────────── */}
      <div className="px-4 py-4">

        {/* Products tab */}
        {activeTab === 'products' && (
          <ProductGrid
            products={products}
            loading={false}
            onRequestOrder={(product) =>
              navigate(`/products/${product.id}?action=request`)
            }
            emptyMessage="No products yet"
            emptySubMessage="This artisan hasn't listed products yet"
          />
        )}

        {/* Story tab */}
        {activeTab === 'story' && (
          <div className="max-w-lg mx-auto">
            {seller.story ? (
              <div className="prose-sm text-warm-700 leading-relaxed space-y-4">
                {/* Render story paragraphs — simple text split by double newline */}
                {seller.story.split('\n\n').map((para, i) => {
                  // Check if it's a heading (starts with ##)
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
                <span className="text-4xl block mb-3">📖</span>
                <p className="text-sm text-warm-500">
                  This artisan hasn't shared their story yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reviews tab */}
        {activeTab === 'reviews' && (
          <div>
            {reviewCount === 0 ? (
              <div className="text-center py-10">
                <span className="text-4xl block mb-3">⭐</span>
                <p className="text-sm text-warm-500">No reviews yet.</p>
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
                    <p className="text-[10px] text-warm-400 mt-1">{reviewCount} reviews</p>
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
