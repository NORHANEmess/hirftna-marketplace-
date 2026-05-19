import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, ChevronRight, FileText, Hammer, MapPin,
  Search, Shield, Package, ShoppingBag, Star, Store, Users,
} from 'lucide-react';
import { extractApiItems, productsAPI, promotionsAPI, sellersAPI } from '../services/api';
import { formatProductPrice } from '../components/product/ProductCard';
import { useTranslation } from '../i18n/index.jsx';
import { useInView } from '../hooks/useInView';

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, subtitle, onSeeAll, seeAllLabel }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-end justify-between mb-5 px-4 md:px-0">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold tracking-[0.2em] text-brick-500 uppercase mb-1">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-bold text-warm-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-warm-400 mt-0.5">{subtitle}</p>}
      </div>
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className="flex items-center gap-0.5 text-xs font-semibold text-brick-600 hover:text-brick-700 transition-colors"
        >
          {seeAllLabel ?? t('home.featured.seeAll')} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-beige-200 rounded-2xl ${className}`} />;
}

// ─── Seller Card ──────────────────────────────────────────────────────────────
function SellerCard({ seller }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const gradients = [
    'from-sage-200 to-sage-300',
    'from-beige-200 to-cream-300',
    'from-sage-100 to-beige-200',
    'from-warm-200 to-beige-300',
  ];
  const gradientIndex = (seller.shop_name?.charCodeAt(0) ?? 0) % gradients.length;

  return (
    <div
      onClick={() => navigate(`/sellers/${seller.id}`)}
      className="bg-white rounded-2xl border border-beige-200 overflow-hidden cursor-pointer hover-lift
        hover:border-sage-200 transition-colors duration-200 flex flex-col"
    >
      <div className={`h-20 bg-gradient-to-br ${gradients[gradientIndex]} relative flex-shrink-0`}>
        {seller.cover_url && (
          <img src={seller.cover_url} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="px-4 pb-4 flex-1 flex flex-col">
        <div className="flex justify-center -mt-7 mb-3">
          {seller.avatar_url ? (
            <img
              src={seller.avatar_url}
              alt={seller.shop_name}
              className="w-14 h-14 rounded-full object-cover border-4 border-white shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sage-400 to-sage-600 border-4 border-white shadow-sm flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {seller.shop_name?.charAt(0)?.toUpperCase() ?? 'A'}
              </span>
            </div>
          )}
        </div>
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-sm font-bold text-warm-900 truncate max-w-[120px]">{seller.shop_name}</p>
            {seller.is_verified && <CheckCircle2 size={14} className="text-sage-500 flex-shrink-0" />}
          </div>
          {seller.location && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <MapPin size={10} className="text-warm-400" />
              <span className="text-[10px] text-warm-400">{seller.location}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="text-center">
            <p className="text-sm font-bold text-warm-900">{seller.products?.length ?? '—'}</p>
            <p className="text-[9px] text-warm-400">{t('home.sellers.products')}</p>
          </div>
          <div className="w-px h-6 bg-beige-200" />
          <div className="flex items-center gap-1">
            <Star size={12} className="text-warning fill-warning" />
            <p className="text-sm font-bold text-warm-900">
              {seller.avg_rating ? Number(seller.avg_rating).toFixed(1) : '—'}
            </p>
          </div>
        </div>
        {seller.category?.name && (
          <div className="flex justify-center">
            <span className="text-[10px] font-medium px-3 py-1 bg-cream-200 border border-beige-200 text-warm-600 rounded-full">
              {seller.category.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Featured Product Card ────────────────────────────────────────────────────
function FeaturedProductCard({ product }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const image = product.images?.[0]?.image_url ?? product.product_images?.[0]?.image_url ?? product.image_url ?? null;
  const sellerName = product.seller?.shop_name ?? product.sellers?.shop_name ?? null;
  const isVerified = product.seller?.is_verified ?? product.sellers?.is_verified ?? false;
  const badges = [];

  if (product.is_new)      badges.push({ label: t('home.featured.new'),      color: 'bg-sage-600 text-white' });
  if (product.is_featured) badges.push({ label: t('home.featured.featured'), color: 'bg-warning text-white' });

  const priceStr = formatProductPrice(product, t);
  const price    = priceStr !== '—' ? priceStr : null;

  return (
    <div
      onClick={() => navigate(`/products/${product.id}`)}
      className="bg-white rounded-2xl border border-beige-200 overflow-hidden cursor-pointer hover-lift
        hover:border-sage-200 transition-colors duration-200 flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-beige-100 overflow-hidden flex-shrink-0">
        {image && !imgError ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-beige-100">
            <Package size={28} className="text-beige-300" />
          </div>
        )}
        {badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {badges.map((badge) => (
              <span key={badge.label} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.color}`}>
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {sellerName && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-warm-500 truncate">{sellerName}</span>
            {isVerified && <CheckCircle2 size={10} className="text-sage-500 flex-shrink-0" />}
          </div>
        )}
        {product.avg_rating > 0 && (
          <div className="flex items-center gap-1">
            <Star size={10} className="text-warning fill-warning" />
            <span className="text-[10px] font-semibold text-warm-700">{Number(product.avg_rating).toFixed(1)}</span>
            {product.review_count > 0 && (
              <span className="text-[10px] text-warm-400">({product.review_count})</span>
            )}
          </div>
        )}
        <p className="text-sm font-semibold text-warm-900 leading-tight line-clamp-2">{product.name}</p>
        {product.category?.name && <p className="text-[10px] text-warm-400">{product.category.name}</p>}
        {price && <p className="text-sm font-bold text-warm-900 mt-auto pt-1">{price}</p>}
      </div>
    </div>
  );
}

// ─── Product Filter Tabs ──────────────────────────────────────────────────────
function ProductFilterTabs({ active, onChange }) {
  const { t } = useTranslation();
  const tabs = [
    { value: 'all',    label: t('home.featured.tabs.all'),    sort: 'newest' },
    { value: 'newest', label: t('home.featured.tabs.newest'), sort: 'newest' },
    { value: 'rating', label: t('home.featured.tabs.rating'), sort: 'rating' },
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.sort, tab.value)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-150
            ${active === tab.value
              ? 'bg-sage-600 text-white border-sage-600'
              : 'bg-white text-warm-600 border-beige-200 hover:border-sage-300'
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── What Is Hirftna ──────────────────────────────────────────────────────────
function WhatIsHirftna() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [ref, isInView] = useInView({ threshold: 0.1 });

  const pillars = [
    { title: t('home.whatIsHirftna.pillar1Title'), body: t('home.whatIsHirftna.pillar1Body'), link: t('home.whatIsHirftna.pillar1Link'), href: '/browse' },
    { title: t('home.whatIsHirftna.pillar2Title'), body: t('home.whatIsHirftna.pillar2Body') },
    { title: t('home.whatIsHirftna.pillar3Title'), body: t('home.whatIsHirftna.pillar3Body') },
  ];

  return (
    <section ref={ref} className="mt-14 border-t border-beige-200 pt-12 px-4 md:px-0">
      <div className={`text-center mb-10 transition-all duration-500 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
        <h2 className="text-3xl md:text-4xl text-warm-900 mb-3 leading-tight">
          {t('home.whatIsHirftna.title')}
        </h2>
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="text-sm text-warm-600 underline underline-offset-4 decoration-warm-400 hover:text-sage-600 hover:decoration-sage-500 transition-colors"
        >
          {t('home.whatIsHirftna.readStory')}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {pillars.map((pillar, i) => (
          <div
            key={pillar.title}
            className={`flex flex-col gap-3 transition-all duration-500 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <h3 className="text-base font-bold text-warm-900 leading-snug">{pillar.title}</h3>
            <p className="text-sm text-warm-600 leading-relaxed">{pillar.body}</p>
            {pillar.link && pillar.href && (
              <button
                type="button"
                onClick={() => navigate(pillar.href)}
                className="text-sm text-warm-700 underline underline-offset-2 decoration-warm-400 hover:text-sage-600 hover:decoration-sage-500 transition-colors text-left"
              >
                {pillar.link}
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <p className="text-sm font-bold text-warm-900 mb-4">{t('home.whatIsHirftna.ctaQuestion')}</p>
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="inline-flex items-center gap-2 px-7 py-2.5 border-2 border-warm-900 rounded-full text-sm font-semibold text-warm-900 hover:bg-warm-900 hover:text-white transition-all duration-200 active:scale-[0.97]"
        >
          {t('home.whatIsHirftna.ctaButton')}
        </button>
      </div>
    </section>
  );
}

// ─── How It Works Section — Ascending staircase layout ───────────────────────
function HowItWorksSection() {
  const { t } = useTranslation();
  const [ref, isInView] = useInView({ threshold: 0.1 });

  const steps = [
    { id: 1, title: t('home.howItWorks.step1Title'), desc: t('home.howItWorks.step1Desc'), Icon: Search },
    { id: 2, title: t('home.howItWorks.step2Title'), desc: t('home.howItWorks.step2Desc'), Icon: FileText },
    { id: 3, title: t('home.howItWorks.step3Title'), desc: t('home.howItWorks.step3Desc'), Icon: Hammer },
    { id: 4, title: t('home.howItWorks.step4Title'), desc: t('home.howItWorks.step4Desc'), Icon: CheckCircle2 },
  ];

  const stairOffsets = ['mb-0', 'mb-12 lg:mb-16', 'mb-24 lg:mb-32', 'mb-36 lg:mb-48'];

  return (
    <section ref={ref} className="py-20 bg-sage-50 px-4 mt-8 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-500 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <p className="text-[10px] font-bold tracking-[0.2em] text-sage-500 uppercase mb-3">
            {t('home.howItWorks.eyebrow')}
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-warm-900 mb-3 leading-tight">
            {t('home.howItWorks.title')}
          </h2>
          <p className="text-warm-500 text-base">{t('home.howItWorks.subtitle')}</p>
        </div>

        {/* Desktop: ascending staircase — cards rise left to right */}
        <div className="hidden md:flex items-end justify-center gap-4 lg:gap-6">
          {steps.map((step, i) => {
            const { Icon } = step;
            return (
              <div
                key={step.id}
                className={`relative w-44 lg:w-52 flex-shrink-0 ${stairOffsets[i]}
                  transition-all duration-500 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Step number badge */}
                <div className="absolute -top-3 -start-3 w-7 h-7 rounded-full bg-brick-500 text-white
                  flex items-center justify-center text-xs font-bold shadow-soft-sm select-none z-10">
                  {step.id}
                </div>
                <div className="bg-white rounded-2xl p-5 text-center border border-beige-200 shadow-soft-sm">
                  <div className="w-12 h-12 rounded-2xl bg-sage-50 flex items-center justify-center mx-auto mb-3">
                    <Icon size={22} className="text-sage-500" />
                  </div>
                  <h3 className="font-semibold text-sm text-warm-900 leading-snug mb-1.5">{step.title}</h3>
                  <p className="text-xs text-warm-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="md:hidden relative ps-10">
          <div className="absolute start-[1.125rem] top-2 bottom-2 w-0.5 bg-beige-200 pointer-events-none" aria-hidden="true" />
          <div className="space-y-5">
            {steps.map((step, i) => {
              const { Icon } = step;
              return (
                <div
                  key={step.id}
                  className={`relative transition-all duration-500 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  {/* Timeline dot */}
                  <div className="absolute -start-10 top-3 w-8 h-8 rounded-full bg-brick-500 text-white
                    flex items-center justify-center text-xs font-bold flex-shrink-0 z-10 ring-4 ring-sage-50">
                    {step.id}
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-beige-200 shadow-soft-sm">
                    <div className="flex items-center gap-3 mb-1.5">
                      <Icon size={18} className="text-sage-500 flex-shrink-0" />
                      <h3 className="font-semibold text-sm text-warm-900 leading-snug">{step.title}</h3>
                    </div>
                    <p className="text-xs text-warm-500 leading-relaxed ps-7">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Hero Left ────────────────────────────────────────────────────────────────
function HeroLeft() {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?search=${encodeURIComponent(query.trim())}`);
    else navigate('/browse');
  }

  return (
    <div className="flex flex-col justify-center h-full px-6 sm:px-10 lg:px-16 py-14 lg:py-0">
      {/* Eyebrow badge */}
      <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-brick-500 uppercase mb-5 animate-fade-in-up">
        <span className="w-5 h-px bg-brick-400" aria-hidden="true" />
        {t('home.hero.badge')}
      </span>

      {/* Display headline */}
      <h1 className="text-5xl sm:text-6xl lg:text-[3.75rem] xl:text-7xl font-bold text-warm-900 leading-[1.05] mb-4 animate-fade-in-up delay-75">
        {t('home.hero.title')}
      </h1>

      {/* Subheadline */}
      <p className="text-warm-600 text-base lg:text-lg leading-relaxed mb-8 max-w-sm animate-fade-in-up delay-150">
        {t('home.hero.subtitle')}
      </p>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6 animate-fade-in-up delay-200">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('home.hero.searchPlaceholder')}
            aria-label={t('home.hero.searchPlaceholder')}
            className="w-full pl-11 pr-14 py-3.5 rounded-full border-2 border-beige-300 bg-white text-warm-800
              text-sm placeholder-warm-400 focus:outline-none focus:border-sage-400 shadow-soft-sm
              transition-all duration-200"
          />
          <button
            type="submit"
            aria-label={t('browse.searchPlaceholder')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-sage-500 hover:bg-sage-600
              text-white rounded-full flex items-center justify-center transition-colors active:scale-95"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </form>

      {/* CTA */}
      <div className="flex items-center gap-4 animate-fade-in-up delay-300 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="inline-flex items-center gap-2 bg-sage-500 hover:bg-sage-600 text-white text-sm
            font-semibold px-6 py-3 rounded-full transition-all duration-200 shadow-soft-sm
            hover:shadow-soft active:scale-[0.97]"
        >
          {t('home.hero.cta')} <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="text-sm font-medium text-warm-600 hover:text-sage-600 transition-colors underline-offset-2 hover:underline"
        >
          {t('home.hero.sellerCta')}
        </button>
      </div>

      {/* Trust indicators */}
      <div className="flex items-center gap-5 mt-8 animate-fade-in-up delay-400 flex-wrap">
        {[
          { icon: Shield,  label: t('home.hero.trust1') },
          { icon: Package, label: t('home.hero.trust2') },
          { icon: Users,   label: t('home.hero.trust3') },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-warm-500 text-xs">
            <Icon size={13} className="text-sage-500 flex-shrink-0" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Hero Right ───────────────────────────────────────────────────────────────
function HeroRight({ ad }) {
  const { t }    = useTranslation();
  const navigate = useNavigate();

  if (!ad) {
    return (
      <div className="flex items-center justify-center h-full px-6 py-12">
        <div className="bg-white rounded-3xl border border-beige-200 shadow-soft-md p-8 text-center max-w-xs w-full animate-fade-in-right delay-200">
          <div className="w-20 h-20 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Store size={32} className="text-sage-500" />
          </div>
          <h3 className="font-bold text-xl text-warm-900 mb-2 leading-snug">
            {t('home.hero.noPromotions.title')}
          </h3>
          <p className="text-sm text-warm-500 mb-5 leading-relaxed">
            {t('home.hero.noPromotions.sub')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="btn-primary btn-sm"
          >
            {t('home.hero.noPromotions.cta')}
          </button>
        </div>
      </div>
    );
  }

  const seller   = ad.seller;
  const products = ad.products ?? seller?.products ?? [];

  return (
    <div className="flex items-center justify-center h-full px-6 py-10 lg:py-0">
      <div
        onClick={() => seller?.id && navigate(`/sellers/${seller.id}`)}
        className="bg-white rounded-3xl border border-beige-200 shadow-soft-md overflow-hidden
          cursor-pointer hover-lift max-w-xs w-full animate-fade-in-right delay-200"
      >
        {/* Artisan photo */}
        <div className="relative">
          <div className="aspect-[4/5] bg-cream-200 overflow-hidden">
            {seller?.avatar_url ? (
              <img
                src={seller.avatar_url}
                alt={seller.shop_name}
                loading="eager"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-sage-200 to-sage-400 flex items-center justify-center">
                <span className="text-white font-bold text-6xl opacity-40">
                  {seller?.shop_name?.charAt(0)?.toUpperCase() ?? 'A'}
                </span>
              </div>
            )}
          </div>
          {/* Featured badge */}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-sage-500 text-white
            text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            ✦ {t('home.hero.featuredArtisan')}
          </span>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-bold text-lg text-warm-900 truncate leading-snug">
              {seller?.shop_name}
            </h3>
            {seller?.is_verified && (
              <CheckCircle2 size={15} className="text-sage-500 flex-shrink-0" />
            )}
          </div>

          {(seller?.avg_rating || seller?.city) && (
            <div className="flex items-center gap-3 text-xs text-warm-500 mb-3">
              {seller.avg_rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star size={11} className="text-warning fill-warning" />
                  {Number(seller.avg_rating).toFixed(1)}
                </span>
              )}
              {seller.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {seller.city}
                </span>
              )}
            </div>
          )}

          {/* Product thumbnails */}
          {products.length > 0 && (
            <div className="flex gap-1.5 mb-3">
              {products.slice(0, 3).map((product, i) => {
                const img = product.product_images?.[0]?.image_url ?? product.image_url ?? null;
                return (
                  <button
                    key={product.id ?? i}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/products/${product.id}`); }}
                    className="w-16 h-16 rounded-xl overflow-hidden bg-cream-200 flex-shrink-0
                      hover:ring-2 hover:ring-sage-300 transition-all"
                    aria-label={product.name}
                  >
                    {img ? (
                      <img src={img} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={14} className="text-warm-300" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); seller?.id && navigate(`/sellers/${seller.id}`); }}
            className="inline-flex items-center gap-1 text-sage-600 hover:text-sage-700 text-xs font-semibold transition-colors"
          >
            {t('home.hero.visitShop')} <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hero Skeleton ────────────────────────────────────────────────────────────
function HeroSkeleton() {
  return (
    <section className="min-h-[calc(100dvh-4rem)] bg-cream-50">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100dvh-4rem)]">
        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-14 space-y-4">
          <div className="h-3 w-28 bg-beige-300 rounded-full animate-pulse" />
          <div className="h-14 w-3/4 bg-beige-300 rounded-xl animate-pulse" />
          <div className="h-4 w-1/2 bg-beige-200 rounded-full animate-pulse" />
          <div className="h-12 w-full max-w-md bg-beige-200 rounded-full animate-pulse" />
          <div className="h-11 w-36 bg-beige-300 rounded-full animate-pulse" />
        </div>
        <div className="hidden lg:flex items-center justify-center bg-beige-100/50 px-10">
          <div className="w-72 h-[26rem] bg-beige-200 rounded-3xl animate-pulse" />
        </div>
      </div>
    </section>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function HeroSection({ heroAds }) {
  const { t } = useTranslation();

  if (heroAds === null) return <HeroSkeleton />;

  // Pick one at random — variety on each page load
  const ad = heroAds.length > 0
    ? heroAds[Math.floor(Math.random() * heroAds.length)]
    : null;

  return (
    <section
      className="relative min-h-[calc(100dvh-4rem)] bg-cream-50 overflow-hidden"
      aria-label="Hero section"
    >
      {/* Subtle geometric pattern — 3% opacity, CSS only */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none select-none"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23728C67' stroke-width='0.8'%3E%3Cpath d='M30 5L55 20v20L30 55 5 40V20Z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100dvh-4rem)]">
        {/* Left: copy + search */}
        <HeroLeft />

        {/* Right: featured artisan card + floating stat chips */}
        <div className="relative lg:flex items-center justify-center bg-sage-50/60 border-t lg:border-t-0 lg:border-l border-beige-200/60 min-h-[52dvh] lg:min-h-0">
          <HeroRight ad={ad} />

          {/* Floating stat chips — desktop only */}
          <div className="hidden lg:flex absolute bottom-6 inset-x-4 justify-between gap-3 pointer-events-none animate-fade-in-up delay-500">
            <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-soft px-4 py-3 flex items-center gap-2.5 border border-beige-100/80">
              <div className="w-8 h-8 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
                <Users size={14} className="text-sage-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-warm-900 leading-none">470K+</p>
                <p className="text-[10px] text-warm-400 mt-0.5">{t('home.hero.statArtisans')}</p>
              </div>
            </div>
            <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-soft px-4 py-3 flex items-center gap-2.5 border border-beige-100/80">
              <div className="w-8 h-8 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
                <Package size={14} className="text-sage-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-warm-900 leading-none">600+</p>
                <p className="text-[10px] text-warm-400 mt-0.5">{t('home.hero.statSpecialties')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [sellers,  setSellers]  = useState([]);
  const [heroAds,  setHeroAds]  = useState(null); // null=loading, []=empty, [...]=has ads
  const [productsLoading, setProductsLoading] = useState(true);
  const [pageLoading,     setPageLoading]     = useState(true);
  const [activeProductTab, setActiveProductTab] = useState('all');

  const [featuredRef, featuredInView] = useInView({ threshold: 0.1 });
  const [sellersRef,  sellersInView]  = useInView({ threshold: 0.1 });

  const loadProducts = async (sort = 'newest', tab = 'all') => {
    setActiveProductTab(tab);
    setProductsLoading(true);
    try {
      const response = await productsAPI.getAll({ limit: 8, sort });
      setProducts(extractApiItems(response, { itemKeys: ['products'] }));
    } catch {
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      productsAPI.getAll({ limit: 8, sort: 'newest' }),
      sellersAPI.getAll({ limit: 4, sort: 'rating' }),
      promotionsAPI.getHeroAds(),
    ])
      .then(([productsRes, sellersRes, heroRes]) => {
        setProducts(extractApiItems(productsRes, { itemKeys: ['products'] }));
        setSellers(extractApiItems(sellersRes,  { itemKeys: ['sellers']  }));
        setHeroAds(heroRes.data?.data?.ads ?? []);
      })
      .catch(() => {
        setProducts([]);
        setSellers([]);
        setHeroAds([]);
      })
      .finally(() => {
        setProductsLoading(false);
        setPageLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Hero ── */}
      <HeroSection heroAds={heroAds} />

      {/* ── Padded content ── */}
      <div className="px-2 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <WhatIsHirftna />
        </div>

        {/* ── Featured Products ── */}
        <section ref={featuredRef} className="mt-12 px-4">
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-sage-500 uppercase mb-1">
                  {t('home.featured.eyebrow')}
                </p>
                <h2 className="text-xl font-bold text-warm-900">{t('home.featured.title')}</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/browse')}
                className="flex items-center gap-0.5 text-xs font-semibold text-brick-600 hover:text-brick-700 transition-colors"
              >
                {t('home.featured.seeAll')} <ChevronRight size={13} />
              </button>
            </div>
            <ProductFilterTabs active={activeProductTab} onChange={loadProducts} />
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={32} className="text-warm-300 mx-auto mb-3" />
              <p className="text-warm-400 text-sm font-medium">{t('home.featured.empty')}</p>
              <p className="text-warm-300 text-xs mt-1">{t('home.featured.emptySub')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {products.slice(0, 8).map((product, i) => (
                <div
                  key={product.id}
                  className={`transition-all duration-500 ${featuredInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: `${i * 50}ms` }}
                >
                  <FeaturedProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Top Artisans ── */}
        <section ref={sellersRef} className="mt-10 px-4">
          <SectionHeader
            eyebrow={t('home.sellers.eyebrow')}
            title={t('home.sellers.title')}
            subtitle={t('home.sellers.subtitle')}
            onSeeAll={() => navigate('/browse')}
            seeAllLabel={t('home.sellers.discoverAll')}
          />

          {pageLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
            </div>
          ) : sellers.length === 0 ? (
            <p className="text-warm-400 text-sm text-center py-8">{t('home.sellers.empty')}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sellers.map((seller, i) => (
                  <div
                    key={seller.id}
                    className={`transition-all duration-500 ${sellersInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                    style={{ transitionDelay: `${i * 75}ms` }}
                  >
                    <SellerCard seller={seller} />
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={() => navigate('/browse')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 border border-beige-200 bg-white
                    text-sm font-semibold text-warm-800 rounded-full hover:border-brick-300
                    hover:text-brick-600 transition-all duration-200 shadow-sm active:scale-[0.97]"
                >
                  {t('home.sellers.discoverAll')} <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
        </section>

        {/* ── How It Works ── */}
        <HowItWorksSection />

        {/* ── Seller CTA banner ── */}
        <section className="mt-6 mx-4 mb-4">
          <div
            onClick={() => navigate('/register')}
            className="bg-gradient-to-r from-sage-500 to-sage-700 rounded-3xl p-6 cursor-pointer
              hover:opacity-95 transition-opacity active:scale-[0.99]"
          >
            <p className="text-white/70 text-xs mb-1">{t('home.sellerCta.question')}</p>
            <p className="text-white text-lg font-bold mb-3 leading-tight">
              {t('home.sellerCta.title')}
            </p>
            <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
              {t('home.sellerCta.button')} <ArrowRight size={12} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
