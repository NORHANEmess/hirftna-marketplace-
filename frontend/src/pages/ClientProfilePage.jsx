import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Package,
  ShoppingBag,
  Star,
  UserCircle2,
} from 'lucide-react';
import { clientRatingsAPI, usersAPI } from '../services/api';
import { useTranslation } from '../i18n/index.jsx';

// ─── Helpers ──────────────────────────────────────────────────
function formatDate(dateString, lang) {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

function formatMonthYear(dateString, lang) {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

// ─── Avatar ────────────────────────────────────────────────────
function Avatar({ url, name, size = 72 }) {
  const initials = (name ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-2xl overflow-hidden bg-cream-200 border-2 border-beige-200 flex-shrink-0"
    >
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center">
          <span className="text-white font-bold" style={{ fontSize: size * 0.3 }}>
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Star rating display ───────────────────────────────────────
function StarRow({ rating, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < Math.round(rating) ? 'text-warm-400 fill-warm-400' : 'text-beige-300 fill-beige-200'}
        />
      ))}
    </div>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────
function SkeletonCard({ rows = 3 }) {
  return (
    <div className="bg-white rounded-3xl border border-beige-200 p-5 space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`h-3 bg-cream-200 rounded-full ${i === 0 ? 'w-2/3' : i % 2 === 0 ? 'w-full' : 'w-4/5'}`} />
      ))}
    </div>
  );
}

// ─── Trust badge ───────────────────────────────────────────────
function TrustBadge({ completedOrders, t }) {
  if (completedOrders >= 5) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-sage-50 text-sage-700 ring-1 ring-sage-200">
        <CheckCircle2 size={10} />
        {t('clientProfile.activeBuyer')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-cream-200 text-warm-500 ring-1 ring-beige-200">
      <UserCircle2 size={10} />
      {t('clientProfile.newBuyer')}
    </span>
  );
}

// ─── Stat pill ─────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, accent = false }) {
  return (
    <div className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl ${accent ? 'bg-sage-50' : 'bg-cream-100'}`}>
      <Icon size={14} className={accent ? 'text-sage-600' : 'text-warm-400'} />
      <p className={`text-base font-bold ${accent ? 'text-sage-700' : 'text-warm-900'}`}>{value}</p>
      <p className="text-[9px] font-semibold text-warm-400 uppercase tracking-wider text-center leading-tight">{label}</p>
    </div>
  );
}

// ─── Rating card ───────────────────────────────────────────────
function RatingCard({ rating, lang }) {
  return (
    <div className="py-3 border-b border-beige-100 last:border-0 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-warm-900 truncate">
          {rating.seller?.shop_name ?? '—'}
        </p>
        <span className="text-[10px] text-warm-400 flex-shrink-0">
          {formatDate(rating.created_at, lang)}
        </span>
      </div>
      <StarRow rating={rating.rating} />
      {rating.comment && (
        <p className="text-xs text-warm-600 leading-relaxed">{rating.comment}</p>
      )}
    </div>
  );
}

// ─── Order summary row ─────────────────────────────────────────
function OrderRow({ order, lang, t }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-beige-100 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-sage-50 flex items-center justify-center flex-shrink-0">
        <Package size={13} className="text-sage-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-warm-900 truncate">
          {order.product_name ?? t('clientProfile.productFallback')}
        </p>
        <p className="text-[10px] text-warm-400">
          {order.seller_shop_name ?? t('clientProfile.shopFallback')}
          {' · '}
          {formatDate(order.completed_at, lang)}
        </p>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────
export default function ClientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();

  const [profileLoading, setProfileLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [profile, setProfile]   = useState(null);
  const [ratings, setRatings]   = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!id) return;

    // Fetch profile and ratings in parallel
    usersAPI.getPublicProfile(id)
      .then((res) => {
        const data = res.data?.data;
        if (data) setProfile(data);
        else setError(t('clientProfile.notFound'));
      })
      .catch(() => setError(t('clientProfile.loadingError')))
      .finally(() => setProfileLoading(false));

    clientRatingsAPI.getByClient(id)
      .then((res) => {
        const data = res.data?.data;
        setRatings(data?.ratings ?? []);
        setAvgRating(data?.avgRating ?? 0);
      })
      .catch(() => {})
      .finally(() => setRatingsLoading(false));
  }, [id, t]);

  // ── Error state ──────────────────────────────────────────────
  if (!profileLoading && error) {
    return (
      <div className="min-h-screen bg-cream-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle size={22} className="text-danger" />
        </div>
        <p className="text-sm font-semibold text-warm-700">{error}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-xs text-sage-600 font-semibold underline"
        >
          {t('clientProfile.backButton')}
        </button>
      </div>
    );
  }

  const completedOrders = profile?.stats?.completed_orders ?? 0;
  const recentOrders    = profile?.recent_completed_orders ?? [];
  const user            = profile?.user;

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Sticky header ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white border border-beige-200 flex items-center justify-center hover:bg-cream-200 transition-colors"
          >
            <ArrowLeft size={15} className="text-warm-700" />
          </button>
          <h1 className="text-base font-bold text-warm-900">{t('clientProfile.title')}</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* ── Client info header card ── */}
        {profileLoading ? (
          <SkeletonCard rows={2} />
        ) : (
          <div className="bg-white rounded-3xl border border-beige-200 p-5">
            <div className="flex items-center gap-4">
              <Avatar url={user?.avatar_url} name={user?.full_name} size={72} />
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-lg font-bold text-warm-900 truncate">
                  {user?.full_name ?? '—'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-warm-400">
                  <CalendarDays size={11} />
                  <span>
                    {t('clientProfile.memberSince', {
                      date: formatMonthYear(user?.created_at, lang),
                    })}
                  </span>
                </div>
                <TrustBadge completedOrders={completedOrders} t={t} />
              </div>
            </div>
          </div>
        )}

        {/* ── Stats bar ── */}
        {profileLoading ? (
          <SkeletonCard rows={1} />
        ) : (
          <div className="flex gap-2">
            <StatPill
              icon={ShoppingBag}
              label={t('clientProfile.completedOrders')}
              value={completedOrders}
              accent={completedOrders >= 5}
            />
            <StatPill
              icon={Star}
              label={t('clientProfile.avgRating')}
              value={ratingsLoading ? '…' : (avgRating > 0 ? `${avgRating} / 5` : t('clientProfile.noRatingsYet'))}
            />
            <StatPill
              icon={CalendarDays}
              label={t('common.memberSince')}
              value={formatMonthYear(user?.created_at, lang).split(' ')[1] ?? '—'}
            />
          </div>
        )}

        {/* ── Seller ratings section ── */}
        <div className="bg-white rounded-3xl border border-beige-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-beige-100">
            <Star size={14} className="text-warm-400" />
            <p className="text-sm font-bold text-warm-900">{t('clientProfile.ratingsTitle')}</p>
            {!ratingsLoading && ratings.length > 0 && (
              <span className="ml-auto text-xs font-semibold text-warm-400">
                {avgRating > 0 && `${avgRating} / 5`}
              </span>
            )}
          </div>

          <div className="px-5 pb-4">
            {ratingsLoading ? (
              <div className="space-y-3 pt-3">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-1.5 animate-pulse">
                    <div className="h-3 bg-cream-200 rounded-full w-1/3" />
                    <div className="h-2.5 bg-cream-200 rounded-full w-1/4" />
                    <div className="h-3 bg-cream-200 rounded-full w-5/6" />
                  </div>
                ))}
              </div>
            ) : ratings.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Star size={24} className="text-beige-300" />
                <p className="text-sm font-semibold text-warm-500">{t('clientProfile.noRatings')}</p>
                <p className="text-xs text-warm-400">{t('clientProfile.noRatingsSub')}</p>
              </div>
            ) : (
              <div className="divide-y-0">
                {ratings.map((rating) => (
                  <RatingCard key={rating.id} rating={rating} lang={lang} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent completed orders ── */}
        {!profileLoading && (
          <div className="bg-white rounded-3xl border border-beige-200 overflow-hidden">
            <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-beige-100">
              <ShoppingBag size={14} className="text-warm-400" />
              <p className="text-sm font-bold text-warm-900">{t('clientProfile.recentOrdersTitle')}</p>
            </div>

            <div className="px-5 pb-4">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <ShoppingBag size={24} className="text-beige-300" />
                  <p className="text-sm font-semibold text-warm-500">{t('clientProfile.noRecentOrders')}</p>
                </div>
              ) : (
                recentOrders.map((order) => (
                  <OrderRow key={order.id} order={order} lang={lang} t={t} />
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
