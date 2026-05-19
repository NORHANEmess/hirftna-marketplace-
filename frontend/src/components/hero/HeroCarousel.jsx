import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../i18n/index.jsx';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function HeroSkeleton() {
  return (
    <div className="relative min-h-[78dvh] w-full overflow-hidden bg-gradient-to-br from-sage-800 to-sage-900 flex items-end">
      <div className="absolute inset-0 animate-pulse bg-white/5" />
      <div className="px-6 sm:px-12 pb-10 sm:pb-14 w-full space-y-3">
        <div className="h-6 w-28 bg-white/15 rounded-full animate-pulse" />
        <div className="h-12 w-64 bg-white/15 rounded-xl animate-pulse" />
        <div className="h-4 w-44 bg-white/10 rounded-full animate-pulse" />
        <div className="h-12 w-36 bg-white/15 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

// ─── Main Carousel ────────────────────────────────────────────────────────────
export default function HeroCarousel({ ads }) {
  const { t }        = useTranslation();
  const navigate     = useNavigate();
  const [current, setCurrent] = useState(0);
  const timerRef    = useRef(null);
  const touchStartX = useRef(null);

  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ).current;

  const count = ads?.length ?? 0;

  function goTo(index) {
    setCurrent((index + count) % count);
  }

  // All hooks before any early returns
  useEffect(() => {
    if (reducedMotion || count <= 1) return;
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % count), 5000);
    return () => clearInterval(timerRef.current);
  }, [count, reducedMotion]);

  if (ads === null) return <HeroSkeleton />;
  if (!ads || ads.length === 0) return null;

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    goTo(delta < 0 ? current + 1 : current - 1);
  }

  const seller = ads[current]?.seller;

  return (
    <section
      role="region"
      aria-label={t('promotions.heroCarouselLabel')}
      className="relative min-h-[78dvh] w-full overflow-hidden cursor-pointer select-none bg-sage-900"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => seller?.id && navigate(`/sellers/${seller.id}`)}
    >
      {/* ── Progress bars at top ── */}
      {count > 1 && !reducedMotion && (
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-4 pt-2.5">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="h-[3px] flex-1 bg-white/25 rounded-full overflow-hidden">
              {i < current && (
                <div className="h-full w-full bg-white rounded-full" />
              )}
              {i === current && (
                <div
                  key={`p-${current}`}
                  className="h-full bg-white rounded-full origin-left animate-progress-fill"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Slide layers (all in DOM, crossfade via opacity) ── */}
      {ads.map((ad, i) => {
        const s  = ad.seller;
        const bg = s?.avatar_url;
        const isActive = i === current;
        return (
          <div
            key={ad.id}
            className={`absolute inset-0 transition-opacity ease-in-out ${reducedMotion ? 'duration-0' : 'duration-700'} ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            aria-hidden={!isActive}
          >
            {/* Background */}
            {bg ? (
              <img
                src={bg}
                alt=""
                loading={i === 0 ? 'eager' : 'lazy'}
                className={`absolute inset-0 w-full h-full object-cover${isActive && !reducedMotion ? ' animate-ken-burns' : ''}`}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-sage-500 via-sage-700 to-sage-900">
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }}
                />
              </div>
            )}
            {/* Cinematic overlay — bottom heavy + left lean */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
          </div>
        );
      })}

      {/* ── Content ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-6 sm:px-12 pb-10 sm:pb-14"
        aria-live="polite"
      >
        {/* Badge */}
        <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white text-[11px] font-bold px-4 py-1.5 rounded-full border border-white/20 tracking-widest uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-sage-300 animate-pulse flex-shrink-0" />
          {t('promotions.heroBadge')}
        </span>

        {/* Shop name + verified badge */}
        <div className="flex items-end gap-3 mb-1.5">
          <h2 className="text-white text-4xl sm:text-5xl font-black leading-none tracking-tight drop-shadow-2xl">
            {seller?.shop_name ?? ''}
          </h2>
          {seller?.is_verified && (
            <BadgeCheck size={26} className="text-sage-300 mb-0.5 flex-shrink-0 drop-shadow" />
          )}
        </div>

        {/* Category */}
        {seller?.category?.name && (
          <p className="text-white/50 text-[11px] font-bold tracking-widest uppercase mb-3">
            {seller.category.name}
          </p>
        )}

        {/* Bio */}
        {seller?.bio && (
          <p className="text-white/65 text-sm leading-relaxed line-clamp-2 mb-6 max-w-md">
            {seller.bio}
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            seller?.id && navigate(`/sellers/${seller.id}`);
          }}
          className="group inline-flex items-center gap-2.5 bg-white text-sage-800 text-sm font-bold px-7 py-3.5 rounded-2xl hover:bg-cream-50 active:scale-[0.97] transition-all duration-200 shadow-xl"
        >
          {t('promotions.visitShop')}
          <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
        </button>
      </div>

      {/* ── Desktop arrows ── */}
      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={(e) => { e.stopPropagation(); goTo(current - 1); }}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm text-white border border-white/15 hover:bg-black/45 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={(e) => { e.stopPropagation(); goTo(current + 1); }}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm text-white border border-white/15 hover:bg-black/45 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* ── Dot indicators ── */}
      {count > 1 && (
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t('promotions.slideN', { n: i + 1 })}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
              className="rounded-full bg-white transition-all duration-300"
              style={{ width: current === i ? 22 : 6, height: 6, opacity: current === i ? 1 : 0.35 }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
