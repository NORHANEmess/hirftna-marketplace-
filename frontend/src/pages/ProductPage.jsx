import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, Heart, CheckCircle2, Clock, ChevronLeft,
  ChevronRight, MessageSquare, Package, Truck, ShieldCheck,
} from 'lucide-react';
import {
  extractApiEntity,
  extractApiItems,
  productsAPI,
  reviewsAPI,
  wishlistAPI,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatProductPrice } from '../components/product/ProductCard';
import { useTranslation } from '../i18n/index.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(dateStr, t, lang = 'en') {
  if (!dateStr) return '';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return t('common.justNow');
  if (mins  < 60) return t('common.minutesAgo', { count: mins });
  if (hours < 24) return t('common.hoursAgo', { count: hours });
  if (days  < 7)  return t('common.daysAgo', { count: days });
  return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-GB', { day: 'numeric', month: 'short' });
}

// ─── Image Gallery ────────────────────────────────────────────────────────────
function ImageGallery({ images, name }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const list = images?.length ? images : [{ image_url: null }];

  function prev() { setActive(i => (i - 1 + list.length) % list.length); }
  function next() { setActive(i => (i + 1) % list.length); }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-cream-200 border border-beige-200">
        {list[active]?.image_url ? (
          <img
            src={list[active].image_url}
            alt={name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={48} className="text-beige-300" />
          </div>
        )}

        {/* Handmade badge */}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-sage-600
          text-[10px] font-bold px-2.5 py-1 rounded-full border border-sage-100">
          {t('product.handmade')}
        </span>

        {/* Navigation arrows — only if multiple images */}
        {list.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80
                backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm
                hover:bg-white transition-colors"
            >
              <ChevronLeft size={16} className="text-warm-700" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80
                backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm
                hover:bg-white transition-colors"
            >
              <ChevronRight size={16} className="text-warm-700" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {list.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {list.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`rounded-full transition-all duration-200
                  ${i === active ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {list.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all
                ${i === active
                  ? 'border-sage-500 opacity-100'
                  : 'border-beige-200 opacity-60 hover:opacity-90'
                }`}
            >
              {img.image_url
                ? <img src={img.image_url} alt="" className="w-full h-full object-contain" />
                : <div className="w-full h-full bg-cream-200 flex items-center justify-center"><Package size={16} className="text-beige-300" /></div>
              }
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Trust Badges ─────────────────────────────────────────────────────────────
function TrustBadges({ completionDays }) {
  const { t } = useTranslation();
  const badges = [
    { icon: ShieldCheck, label: t('product.trust.quality') },
    { icon: Package,     label: t('product.trust.custom')  },
    { icon: Clock,       label: completionDays ? t('product.trust.timeline', { days: completionDays }) : t('product.trust.flexTimeline') },
    { icon: Truck,       label: t('product.trust.delivery') },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {badges.map(({ icon, label }) => {
        const Icon = icon;
        return (
        <div key={label} className="flex items-center gap-2 px-3 py-2 bg-cream-100
          border border-beige-200 rounded-xl">
          <Icon size={13} className="text-sage-500 flex-shrink-0" />
          <span className="text-[10px] font-medium text-warm-700 leading-tight">{label}</span>
        </div>
        );
      })}
    </div>
  );
}

// ─── Star Rating Display ──────────────────────────────────────────────────────
function Stars({ rating, size = 12 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(rating) ? 'text-warning fill-warning' : 'text-beige-200 fill-beige-200'}
        />
      ))}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  const { t, lang } = useTranslation();
  const client = review.client;
  const initial = client?.full_name?.[0]?.toUpperCase();
  return (
    <div className="py-4 border-b border-beige-100 last:border-0">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            {client?.avatar_url ? (
              <img
                src={client.avatar_url}
                alt={client.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-sage-300 to-sage-500
                flex items-center justify-center text-white text-xs font-bold">
                {initial ?? '?'}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-warm-900">
              {client?.full_name ?? t('common.anonymous')}
            </p>
            <Stars rating={review.rating} size={10} />
          </div>
        </div>
        <span className="text-[10px] text-warm-400 flex-shrink-0">
          {formatRelativeTime(review.created_at, t, lang)}
        </span>
      </div>
      {review.comment && (
        <p className="text-sm text-warm-700 leading-relaxed pl-10">{review.comment}</p>
      )}
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`py-1.5 px-4 text-xs font-semibold rounded-full border transition-all whitespace-nowrap
        ${active
          ? 'bg-sage-500 text-white border-sage-500'
          : 'bg-white text-warm-500 border-beige-200 hover:border-sage-300 hover:text-warm-700'
        }`}
    >
      {children}
    </button>
  );
}

// ─── Sticky CTA (mobile) ──────────────────────────────────────────────────────
function StickyCTA({ product, onRequest }) {
  const { t } = useTranslation();
  if (!product.is_active) return null;
  return (
    <div className="fixed bottom-20 left-3 right-3 md:hidden z-40">
      <div className="bg-white/95 backdrop-blur-sm border border-beige-200 rounded-2xl
        p-3.5 shadow-lg flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-warm-400">{t('product.price')}</p>
          <p className="text-sm font-bold text-warm-900">{formatProductPrice(product, t)}</p>
        </div>
        <button
          onClick={onRequest}
          className="flex-shrink-0 px-5 py-2.5 bg-sage-500 hover:bg-sage-600 text-white
            text-sm font-bold rounded-xl transition-colors"
        >
          {t('product.requestOrder')}
        </button>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-pulse">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square bg-beige-200 rounded-3xl" />
        <div className="space-y-4">
          <div className="h-6 bg-beige-200 rounded-full w-3/4" />
          <div className="h-4 bg-beige-200 rounded-full w-1/2" />
          <div className="h-16 bg-beige-200 rounded-2xl" />
          <div className="h-12 bg-beige-200 rounded-2xl" />
          <div className="h-12 bg-beige-200 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Main ProductPage ─────────────────────────────────────────────────────────
export default function ProductPage() {
  const { t } = useTranslation();
  const { id }                     = useParams();
  const navigate                   = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [product,    setProduct]    = useState(null);
  const [reviews,    setReviews]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('details');
  const [wishlisted, setWishlisted] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productsAPI.getById(id),
      reviewsAPI.getProductReviews(id),
    ])
      .then(([prodRes, revRes]) => {
        const p = extractApiEntity(prodRes, 'product');
        setProduct(p ?? null);

        setReviews(extractApiItems(revRes, { itemKeys: ['reviews'] }));

        if (isAuthenticated && p) {
          wishlistAPI.check(p.id)
            .then((r) => {
              const payload = extractApiEntity(r) ?? {};
              setWishlisted(payload.inWishlist ?? payload.in_wishlist ?? false);
            })
            .catch(() => {});
        }
      })
      .catch(() => setError(t('product.errorLoad')))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, t]);

  async function handleWishlist() {
    if (!isAuthenticated) { navigate('/login'); return; }
    const next = !wishlisted;
    setWishlisted(next);
    setWishLoading(true);
    try {
      next ? await wishlistAPI.add(product.id) : await wishlistAPI.remove(product.id);
    } catch {
      setWishlisted(!next);
    } finally {
      setWishLoading(false);
    }
  }

  function handleRequest() {
    if (!isAuthenticated) { navigate('/login'); return; }
    window.dispatchEvent(new CustomEvent('open-order-form', { detail: { product } }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100">
        <PageSkeleton />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <Package size={48} className="text-warm-300" />
        <p className="text-warm-800 font-semibold text-lg">{error ?? t('product.notFound')}</p>
        <Link to="/browse" className="text-sage-600 hover:underline text-sm">
          {t('product.backToBrowse')}
        </Link>
      </div>
    );
  }

  const seller = product.seller ?? product.sellers ?? null;

  return (
    <div className="min-h-screen bg-cream-100 pb-40 md:pb-10">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-xs text-warm-400 mb-6">
          <Link to="/" className="hover:text-sage-600 transition-colors">{t('product.breadcrumb.home')}</Link>
          <ChevronRight size={12} />
          <Link to="/browse" className="hover:text-sage-600 transition-colors">{t('product.breadcrumb.products')}</Link>
          <ChevronRight size={12} />
          <span className="text-warm-700 truncate max-w-[160px]">{product.name}</span>
        </nav>

        {/* ── Main Grid ── */}
        <div className="grid md:grid-cols-2 gap-8 mb-10">

          {/* LEFT: Image Gallery */}
          <ImageGallery images={product.product_images} name={product.name} />

          {/* RIGHT: Product Info */}
          <div className="space-y-5">

            {/* Title + Wishlist */}
            <div className="flex items-start gap-3">
              <h1 className="text-2xl font-bold text-warm-900 leading-tight flex-1">
                {product.name}
              </h1>
              <button
                onClick={handleWishlist}
                disabled={wishLoading}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center
                  justify-center transition-all disabled:opacity-50
                  ${wishlisted
                    ? 'bg-brick-50 border-brick-200 text-brick-500'
                    : 'bg-white border-beige-200 text-warm-400 hover:border-brick-200 hover:text-brick-500'
                  }`}
              >
                <Heart size={16} className={wishlisted ? 'fill-brick-500' : ''} />
              </button>
            </div>

            {/* Rating + category */}
            <div className="flex items-center gap-3 flex-wrap">
              {product.avg_rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <Stars rating={product.avg_rating} />
                  <span className="text-xs text-warm-500">
                    {Number(product.avg_rating).toFixed(1)} ({reviews.length})
                  </span>
                </div>
              )}
              {product.categories?.name && (
                <span className="text-[10px] font-semibold bg-cream-200 text-warm-600
                  px-2.5 py-1 rounded-full border border-beige-200">
                  {t(`categories.${product.categories.name}`, product.categories.name)}
                </span>
              )}
              {!product.is_active && (
                <span className="text-[10px] font-bold bg-red-50 text-danger
                  px-2.5 py-1 rounded-full border border-red-100">
                  {t('product.unavailable')}
                </span>
              )}
            </div>

            {/* Price box */}
            <div className="bg-cream-200 border border-beige-200 rounded-2xl p-4">
              <p className="text-[10px] text-warm-400 font-semibold uppercase tracking-wider mb-1">
                {t('product.priceRange')}
              </p>
              <p className="text-3xl font-bold text-warm-800">{formatProductPrice(product, t)}</p>
              {product.completion_days && (
                <p className="text-xs text-warm-400 mt-1.5 flex items-center gap-1">
                  <Clock size={11} />
                  {t('product.completion', { days: product.completion_days })}
                </p>
              )}
            </div>

            {/* Trust badges */}
            <TrustBadges completionDays={product.completion_days} />

            {/* Desktop CTA */}
            {product.is_active && (
              <div className="hidden md:block space-y-2">
                <button
                  onClick={handleRequest}
                  className="w-full py-4 bg-sage-500 hover:bg-sage-600 text-white font-bold
                    text-base rounded-2xl transition-colors shadow-sm"
                >
                  {t('product.requestOrder')}
                </button>
                <p className="text-xs text-center text-warm-400">
                  {t('product.requestOrderSub')}
                </p>
              </div>
            )}

            {/* Seller chip */}
            {seller && (
              <Link
                to={`/sellers/${seller.id}`}
                className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border
                  border-beige-200 hover:border-sage-400 transition-colors"
              >
                {seller.avatar_url ? (
                  <img src={seller.avatar_url} alt={seller.shop_name}
                    className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage-400
                    to-sage-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">
                      {seller.shop_name?.[0]?.toUpperCase() ?? 'A'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-warm-900 truncate">
                      {seller.shop_name}
                    </p>
                    {seller.is_verified && (
                      <CheckCircle2 size={13} className="text-sage-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-warm-400">{t('product.seller.viewProfile')} →</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-3xl border border-beige-200 overflow-hidden">
          <div className="flex gap-2 px-4 py-3 border-b border-beige-100 overflow-x-auto no-scrollbar">
            <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')}>
              {t('product.tabs.details')}
            </TabButton>
            <TabButton active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')}>
              {t('product.tabs.reviews')} {t('product.reviews.count', { count: reviews.length })}
            </TabButton>
            {seller && (
              <TabButton active={activeTab === 'seller'} onClick={() => setActiveTab('seller')}>
                {t('product.tabs.seller')}
              </TabButton>
            )}
          </div>

          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">
                  {product.description ?? t('product.noDescription')}
                </p>
                {product.completion_days && (
                  <div className="flex items-center gap-2 text-sm text-warm-500 pt-3 border-t border-beige-100">
                    <Clock size={14} />
                    {t('product.completion', { days: product.completion_days })}
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="bg-cream-100 border border-beige-200 rounded-2xl p-4">
                  {authLoading ? (
                    <p className="text-sm text-warm-400">{t('product.reviews.checkingSession')}</p>
                  ) : !isAuthenticated ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-warm-800">{t('product.reviews.loginPrompt')}</p>
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-sage-500 text-white text-sm font-semibold rounded-xl hover:bg-sage-600 transition-colors"
                      >
                        {t('product.reviews.signIn')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 px-4 py-3 bg-cream-100 border border-beige-200 rounded-2xl">
                      <MessageSquare size={16} className="text-sage-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-warm-800">{t('product.reviews.orderPrompt')}</p>
                        <p className="text-xs text-warm-500 mt-0.5">
                          {t('product.reviews.orderSubBefore')}{' '}
                          <button
                            type="button"
                            onClick={() => navigate('/orders')}
                            className="text-sage-600 font-semibold hover:underline"
                          >
                            {t('product.reviews.orderSubLink')}
                          </button>{' '}
                          {t('product.reviews.orderSubAfter')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageSquare size={28} className="text-warm-300 mx-auto mb-3" />
                    <p className="text-warm-400 text-sm font-medium">{t('product.reviews.empty')}</p>
                    <p className="text-warm-300 text-xs mt-1">{t('product.reviews.emptySub')}</p>
                  </div>
                ) : (
                  reviews.map(r => <ReviewCard key={r.id} review={r} />)
                )}
              </div>
            )}

            {/* Seller Tab */}
            {activeTab === 'seller' && seller && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {seller.avatar_url ? (
                    <img src={seller.avatar_url} alt={seller.shop_name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-beige-200" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sage-400
                      to-sage-600 flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">
                        {seller.shop_name?.[0]?.toUpperCase() ?? 'A'}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-lg font-bold text-warm-900">
                        {seller.shop_name}
                      </h3>
                      {seller.is_verified && (
                        <CheckCircle2 size={15} className="text-sage-500" />
                      )}
                    </div>
                    {seller.avg_rating > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Stars rating={seller.avg_rating} size={11} />
                        <span className="text-xs text-warm-400">
                          {Number(seller.avg_rating).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {(seller.story || seller.description) && (
                  <p className="text-sm text-warm-700 leading-relaxed border-t border-beige-100 pt-4">
                    {seller.story ?? seller.description}
                  </p>
                )}

                <Link
                  to={`/sellers/${seller.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-sage-400
                    text-sage-600 rounded-full text-sm font-semibold hover:bg-sage-500 hover:text-white
                    transition-all"
                >
                  {t('product.seller.viewProfile')} <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <StickyCTA product={product} onRequest={handleRequest} />
    </div>
  );
}
