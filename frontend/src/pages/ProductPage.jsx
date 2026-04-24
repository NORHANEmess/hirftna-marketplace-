import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, Heart, CheckCircle2, Clock, ChevronLeft,
  ChevronRight, Package, Truck, ShieldCheck, MessageSquare,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Image Gallery ────────────────────────────────────────────────────────────
function ImageGallery({ images, name }) {
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
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">
            🧶
          </div>
        )}

        {/* Handmade badge */}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-sage-600
          text-[10px] font-bold px-2.5 py-1 rounded-full border border-sage-100">
          ✋ Handmade
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
                ? <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-cream-200 flex items-center justify-center">🧶</div>
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
  const badges = [
    { icon: ShieldCheck, label: 'Quality Guaranteed' },
    { icon: Package,     label: 'Custom Made'        },
    { icon: Clock,       label: completionDays ? `${completionDays} days to complete` : 'Flexible timeline' },
    { icon: Truck,       label: 'Flexible Delivery'  },
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

function RatingPicker({ value, onChange, disabled = false }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          disabled={disabled}
          onClick={() => onChange(score)}
          className="transition-transform disabled:opacity-60 hover:scale-105"
        >
          <Star
            size={18}
            className={score <= value ? 'text-warning fill-warning' : 'text-beige-200 fill-beige-200'}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────
function ReviewCard({ review }) {
  return (
    <div className="py-4 border-b border-beige-100 last:border-0">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cream-200 flex items-center
            justify-center text-sm flex-shrink-0">
            {review.user?.full_name?.[0]?.toUpperCase() ?? '👤'}
          </div>
          <div>
            <p className="text-sm font-semibold text-warm-900">
              {review.user?.full_name ?? 'Anonymous'}
            </p>
            <Stars rating={review.rating} size={10} />
          </div>
        </div>
        <span className="text-[10px] text-warm-400 flex-shrink-0">
          {formatRelativeTime(review.created_at)}
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
      className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap
        ${active
          ? 'border-sage-500 text-sage-600'
          : 'border-transparent text-warm-400 hover:text-warm-700'
        }`}
    >
      {children}
    </button>
  );
}

// ─── Sticky CTA (mobile) ──────────────────────────────────────────────────────
function StickyCTA({ product, onRequest }) {
  if (!product.is_active) return null;
  return (
    <div className="fixed bottom-20 left-3 right-3 md:hidden z-40">
      <div className="bg-white/95 backdrop-blur-sm border border-beige-200 rounded-2xl
        p-3.5 shadow-lg flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-warm-400">Price</p>
          <p className="text-sm font-bold text-warm-900">{formatProductPrice(product)}</p>
        </div>
        <button
          onClick={onRequest}
          className="flex-shrink-0 px-5 py-2.5 bg-sage-500 hover:bg-sage-600 text-white
            text-sm font-bold rounded-xl transition-colors"
        >
          Request Order
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
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // ── Load product + reviews in parallel ──
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

        // Check wishlist state if logged in
        if (isAuthenticated && p) {
          wishlistAPI.check(p.id)
            .then((r) => {
              const payload = extractApiEntity(r) ?? {};
              setWishlisted(payload.inWishlist ?? payload.in_wishlist ?? false);
            })
            .catch(() => {});
        }
      })
      .catch(() => setError('Could not load this product'))
      .finally(() => setLoading(false));
  }, [id, isAuthenticated]);

  async function handleWishlist() {
    if (!isAuthenticated) { navigate('/login'); return; }
    const next = !wishlisted;
    setWishlisted(next);
    setWishLoading(true);
    try {
      next ? await wishlistAPI.add(product.id) : await wishlistAPI.remove(product.id);
    } catch {
      setWishlisted(!next); // revert
    } finally {
      setWishLoading(false);
    }
  }

  function handleRequest() {
    if (!isAuthenticated) { navigate('/login'); return; }
    window.dispatchEvent(new CustomEvent('open-order-form', { detail: { product } }));
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setReviewSaving(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      const response = await reviewsAPI.createReview({
        product_id: product.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });

      const createdReview = extractApiEntity(response, 'review');

      if (createdReview) {
        setReviews((current) => [createdReview, ...current]);
      }

      setReviewComment('');
      setReviewRating(5);
      setReviewSuccess('Review submitted successfully.');
    } catch (submitError) {
      setReviewError(
        submitError?.response?.data?.message ??
        submitError?.message ??
        'Failed to submit review.'
      );
    } finally {
      setReviewSaving(false);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100">
        <PageSkeleton />
      </div>
    );
  }

  // ── Error / Not found ──
  if (error || !product) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="text-5xl">😕</span>
        <p className="text-warm-800 font-semibold text-lg">{error ?? 'Product not found'}</p>
        <Link to="/browse" className="text-sage-600 hover:underline text-sm">
          ← Back to Browse
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
          <Link to="/" className="hover:text-sage-600 transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/browse" className="hover:text-sage-600 transition-colors">Products</Link>
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
              <h1 className="text-2xl font-bold text-warm-900 leading-tight flex-1"
                style={{ fontFamily: "'Amiri', serif" }}>
                {product.name}
              </h1>
              <button
                onClick={handleWishlist}
                disabled={wishLoading}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center
                  justify-center transition-all disabled:opacity-50
                  ${wishlisted
                    ? 'bg-danger border-danger text-white'
                    : 'bg-white border-beige-200 text-warm-400 hover:border-danger hover:text-danger'
                  }`}
              >
                <Heart size={16} className={wishlisted ? 'fill-white' : ''} />
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
                  {product.categories.name}
                </span>
              )}
              {!product.is_active && (
                <span className="text-[10px] font-bold bg-red-50 text-danger
                  px-2.5 py-1 rounded-full border border-red-100">
                  Unavailable
                </span>
              )}
            </div>

            {/* Price box */}
            <div className="bg-cream-200 border border-beige-200 rounded-2xl p-4">
              <p className="text-[10px] text-warm-400 font-semibold uppercase tracking-wider mb-1">
                Price Range
              </p>
              <p className="text-3xl font-bold text-warm-900">{formatProductPrice(product)}</p>
              {product.completion_days && (
                <p className="text-xs text-warm-400 mt-1.5 flex items-center gap-1">
                  <Clock size={11} />
                  Estimated completion: {product.completion_days} days
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
                  Request Custom Order
                </button>
                <p className="text-xs text-center text-warm-400">
                  Your request goes directly to the artisan for review
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
                  <p className="text-[10px] text-warm-400">View full profile →</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-3xl border border-beige-200 overflow-hidden">
          <div className="flex gap-6 px-6 border-b border-beige-100 overflow-x-auto no-scrollbar">
            <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')}>
              Details
            </TabButton>
            <TabButton active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')}>
              Reviews ({reviews.length})
            </TabButton>
            {seller && (
              <TabButton active={activeTab === 'seller'} onClick={() => setActiveTab('seller')}>
                About the Artisan
              </TabButton>
            )}
          </div>

          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line">
                  {product.description ?? 'No description available for this product.'}
                </p>
                {product.completion_days && (
                  <div className="flex items-center gap-2 text-sm text-warm-500 pt-3 border-t border-beige-100">
                    <Clock size={14} />
                    Estimated completion time:
                    <strong className="text-warm-800">{product.completion_days} days</strong>
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="bg-cream-100 border border-beige-200 rounded-2xl p-4">
                  {authLoading ? (
                    <p className="text-sm text-warm-400">Checking your session...</p>
                  ) : !isAuthenticated ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-warm-800">Leave a review after you sign in</p>
                      <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-sage-500 text-white text-sm font-semibold rounded-xl hover:bg-sage-600 transition-colors"
                      >
                        Sign In
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleReviewSubmit} className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-warm-800 mb-2">Share your experience</p>
                        <RatingPicker value={reviewRating} onChange={setReviewRating} disabled={reviewSaving} />
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        placeholder="Add an optional comment about this product..."
                        rows={3}
                        className="w-full px-4 py-3 text-sm bg-white border border-beige-200 rounded-2xl outline-none focus:border-sage-400 resize-none"
                      />
                      {reviewError && (
                        <p className="text-xs text-danger">{reviewError}</p>
                      )}
                      {reviewSuccess && (
                        <p className="text-xs text-sage-600">{reviewSuccess}</p>
                      )}
                      <button
                        type="submit"
                        disabled={reviewSaving}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-sage-500 text-white text-sm font-semibold rounded-xl hover:bg-sage-600 transition-colors disabled:opacity-60"
                      >
                        {reviewSaving ? 'Submitting...' : 'Post Review'}
                      </button>
                    </form>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageSquare size={28} className="text-warm-300 mx-auto mb-3" />
                    <p className="text-warm-400 text-sm font-medium">No reviews yet</p>
                    <p className="text-warm-300 text-xs mt-1">
                      Be the first to order and review this product
                    </p>
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
                      <h3 className="text-lg font-bold text-warm-900"
                        style={{ fontFamily: "'Amiri', serif" }}>
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
                  <p className="text-sm text-warm-700 leading-relaxed border-t border-beige-100 pt-4"
                    style={{ fontFamily: "'Amiri', serif" }}>
                    {seller.story ?? seller.description}
                  </p>
                )}

                <Link
                  to={`/sellers/${seller.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-sage-400
                    text-sage-600 rounded-full text-sm font-semibold hover:bg-sage-500 hover:text-white
                    transition-all"
                >
                  View Full Profile <ChevronRight size={14} />
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
