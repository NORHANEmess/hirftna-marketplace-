import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Star, MapPin, CheckCircle2, ShoppingBag } from 'lucide-react';
import { categoriesAPI, productsAPI, sellersAPI } from '../services/api';
import ProductGrid from '../components/product/ProductGrid';

// ─── Constants ────────────────────────────────────────────────────────────

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ eyebrow, title, subtitle, onSeeAll, seeAllLabel = 'See all' }) {
  return (
    <div className="flex items-end justify-between mb-5 px-4 md:px-0 ">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold tracking-[0.2em] text-sage-500 uppercase mb-1">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-bold text-warm-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-warm-400 mt-0.5">{subtitle}</p>}
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="flex items-center gap-0.5 text-xs font-semibold text-sage-600 hover:text-sage-700 transition-colors"
        >
          {seeAllLabel} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-beige-200 rounded-2xl ${className}`} />;
}

// ─── Seller Card ──────────────────────────────────────────────────────────────
function SellerCard({ seller }) {
  const navigate = useNavigate();
  const coverGradients = [
    'from-sage-200 to-sage-300',
    'from-beige-200 to-cream-300',
    'from-sage-100 to-beige-200',
    'from-warm-200 to-beige-300',
  ];
  const gradientIndex = (seller.shop_name?.charCodeAt(0) ?? 0) % coverGradients.length;

  return (
    <div
      onClick={() => navigate(`/sellers/${seller.id}`)}
      className="bg-white rounded-2xl border border-beige-200 overflow-hidden cursor-pointer
        hover:shadow-md hover:border-sage-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      <div className={`h-20 bg-gradient-to-br ${coverGradients[gradientIndex]} relative flex-shrink-0`}>
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
          {seller.city && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <MapPin size={10} className="text-warm-400" />
              <span className="text-[10px] text-warm-400">{seller.city}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="text-center">
            <p className="text-sm font-bold text-warm-900">{seller.total_products ?? '—'}</p>
            <p className="text-[9px] text-warm-400">Products</p>
          </div>
          <div className="w-px h-6 bg-beige-200" />
          <div className="flex items-center gap-1">
            <Star size={12} className="text-warning fill-warning" />
            <p className="text-sm font-bold text-warm-900">
              {seller.avg_rating ? Number(seller.avg_rating).toFixed(1) : '—'}
            </p>
          </div>
          <p className="text-[9px] text-warm-400 -ml-1">Rating</p>
        </div>
        {(seller.category?.name || seller.categories?.name) && (
          <div className="flex justify-center">
            <span className="text-[10px] font-medium px-3 py-1 bg-cream-200 border border-beige-200 text-warm-600 rounded-full">
              {seller.category?.name ?? seller.categories?.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Featured Product Card ────────────────────────────────────────────────────
function FeaturedProductCard({ product }) {
  const navigate     = useNavigate();
  const badges       = [];
  if (product.is_new)      badges.push({ label: 'New',      color: 'bg-sage-600 text-white' });
  if (product.is_featured) badges.push({ label: 'Featured', color: 'bg-warning text-white'  });

  const price      = product.price_min
    ? `DZD ${Number(product.price_min).toLocaleString()}`
    : product.price ? `DZD ${Number(product.price).toLocaleString()}` : null;
  const image      = product.product_images?.[0]?.image_url ?? product.image_url ?? null;
  const sellerName = product.seller?.shop_name   ?? product.sellers?.shop_name   ?? null;
  const isVerified = product.seller?.is_verified ?? product.sellers?.is_verified ?? false;

  return (
    <div
      onClick={() => navigate(`/products/${product.id}`)}
      className="bg-white rounded-2xl border border-beige-200 overflow-hidden cursor-pointer
        hover:shadow-md hover:border-sage-200 hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-cream-200 overflow-hidden flex-shrink-0">
        {image
          ? <img src={image} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">🧶</div>
        }
        {badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {badges.map((b) => (
              <span key={b.label} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${b.color}`}>{b.label}</span>
            ))}
          </div>
        )}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full
            flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <span className="text-warm-400 text-sm">♥</span>
        </button>
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
        {product.categories?.name && <p className="text-[10px] text-warm-400">{product.categories.name}</p>}
        {price && <p className="text-sm font-bold text-warm-900 mt-auto pt-1">{price}</p>}
      </div>
    </div>
  );
}

// ─── Product Filter Tabs ──────────────────────────────────────────────────────
function ProductFilterTabs({ active, onChange }) {
  const tabs = [
    { value: 'all',        label: 'All'          },
    { value: 'newest',     label: 'New Arrivals'  },
    { value: 'bestseller', label: 'Best Sellers'  },
    { value: 'rating',     label: 'Top Rated'     },
  ];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
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

// ─── What Is Hirftna — styled exactly like the Etsy screenshot ───────────────
function WhatIsHirftna() {
  const navigate = useNavigate();

  const pillars = [
    {
      title: 'A community with positive impact',
      body: 'Hirftna is an Algerian online marketplace where people come together to make, sell, buy and discover unique handmade items. We are a community that aims to bring positive change to small businesses, individuals and local culture.',
      link: 'See some examples of the positive impact we create together.',
      href: '/browse',
    },
    {
      title: 'Support for independent creators',
      body: "At Hirftna, we have no warehouse — we have artisans across Algeria who sell what they make. We facilitate this process by helping you connect directly with creators and discover extraordinary handmade and custom pieces.",
      link: null,
      href: null,
    },
    {
      title: 'Peace of mind, guaranteed',
      body: "We place the highest importance on authenticity and trust. Every seller is verified and every product can be commissioned to your exact specifications. If you ever need assistance, we are always ready to help.",
      link: null,
      href: null,
    },
  ];

  return (
    <section className="mt-14 border-t border-beige-200 pt-12 px-4 md:px-0">
      {/* Centered title block */}
      <div className="text-center mb-10">
        <h2
          className="text-3xl md:text-4xl text-warm-900 mb-3 leading-tight"
          style={{ fontFamily: "'Amiri', serif", fontWeight: 400 }}
        >
          What is Hirftna?
        </h2>
        <button
          onClick={() => navigate('/browse')}
          className="text-sm text-warm-600 underline underline-offset-4 decoration-warm-400
            hover:text-sage-600 hover:decoration-sage-500 transition-colors"
        >
          Read our wonderful and unique story
        </button>
      </div>

      {/* 3 pillars — left-aligned text, like Etsy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {pillars.map(({ title, body, link, href }) => (
          <div key={title} className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-warm-900 leading-snug">{title}</h3>
            <p className="text-sm text-warm-600 leading-relaxed">{body}</p>
            {link && href && (
              <button
                onClick={() => navigate(href)}
                className="text-sm text-warm-700 underline underline-offset-2 decoration-warm-400
                  hover:text-sage-600 hover:decoration-sage-500 transition-colors text-left"
              >
                {link}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Bottom CTA row */}
      <div className="mt-10 text-center">
        <p className="text-sm font-bold text-warm-900 mb-4">
          You have a question? Great, we have answers.
        </p>
        <button
          onClick={() => navigate('/browse')}
          className="inline-flex items-center gap-2 px-7 py-2.5 border-2 border-warm-900
            rounded-full text-sm font-semibold text-warm-900
            hover:bg-warm-900 hover:text-white transition-all duration-200"
        >
          Explore the marketplace
        </button>
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();

  const [categories,       setCategories]       = useState([]);
  const [products,         setProducts]         = useState([]);
  const [sellers,          setSellers]          = useState([]);
  const [productsLoading,  setProductsLoading]  = useState(true);
  const [pageLoading,      setPageLoading]      = useState(true);
  const [activeCategory,   setActiveCategory]   = useState(null);
  const [activeProductTab, setActiveProductTab] = useState('all');

  useEffect(() => {
    Promise.all([
      categoriesAPI.getAll(),
      productsAPI.getAll({ limit: 8, sort: 'newest' }),
      sellersAPI.getAll({ limit: 4, sort: 'rating' }),
    ])
      .then(([catsRes, prodsRes, sellersRes]) => {
        const cats  = catsRes.data?.data;
        const prods = prodsRes.data?.data;
        const sells = sellersRes.data?.data;
        setCategories(Array.isArray(cats)  ? cats  : (cats?.categories ?? []));
        setProducts(  Array.isArray(prods) ? prods : (prods?.products  ?? []));
        setSellers(   Array.isArray(sells) ? sells : (sells?.sellers   ?? []));
      })
      .catch(() => {})
      .finally(() => { setProductsLoading(false); setPageLoading(false); });
  }, []);

  const handleCategoryFilter = async (catSlug) => {
    const next = activeCategory === catSlug ? null : catSlug;
    setActiveCategory(next);
    setProductsLoading(true);
    try {
      const params = next ? { category: next, limit: 8 } : { limit: 8, sort: 'newest' };
      const res  = await productsAPI.getAll(params);
      const data = res.data?.data;
      setProducts(Array.isArray(data) ? data : (data?.products ?? []));
    } catch { setProducts([]); }
    finally { setProductsLoading(false); }
  };

  const handleProductTabChange = async (tab) => {
    setActiveProductTab(tab);
    setProductsLoading(true);
    try {
      const sort = tab === 'all' ? 'newest' : tab;
      const res  = await productsAPI.getAll({ limit: 8, sort });
      const data = res.data?.data;
      setProducts(Array.isArray(data) ? data : (data?.products ?? []));
    } catch { setProducts([]); }
    finally { setProductsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10 px-2 lg:px-8">

      {/* ── HERO ── */}
      <section className="relative h-64 sm:h-72 overflow-hidden bg-gradient-to-br from-sage-400 via-sage-500 to-sage-700 mx-3 mt-3 rounded-3xl">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-8 -right-4 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-black/10 rounded-full" />
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle,white 1px,transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 rounded-3xl" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold px-3 py-1 rounded-full mb-2 tracking-wide">
            ✦ Authentic Algerian Handcraft
          </span>
          <h1 className="text-white text-2xl font-bold leading-tight mb-1">
            Every piece tells<br />a story
          </h1>
          <p className="text-white/75 text-sm mb-4">Commission custom work from local artisans</p>
          <button
            onClick={() => navigate('/browse')}
            className="inline-flex items-center gap-2 bg-white text-sage-700 text-sm font-semibold px-5 py-2.5 rounded-2xl hover:bg-cream-100 transition-colors shadow-sm"
          >
            Explore Crafts <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* ── WHAT IS HIRFTNA — replaces Browse by Craft ── */}
      <div className="max-w-5xl mx-auto">
        <WhatIsHirftna />
      </div>

      {/* ── FEATURED PRODUCTS ── */}
      <section className="mt-12 px-4">
        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-sage-500 uppercase mb-1">FEATURED</p>
              <h2 className="text-xl font-bold text-warm-900">Handpicked for You</h2>
            </div>
            <button
              onClick={() => navigate('/browse')}
              className="flex items-center gap-0.5 text-xs font-semibold text-sage-600 hover:text-sage-700 transition-colors"
            >
              See all <ChevronRight size={13} />
            </button>
          </div>
          <ProductFilterTabs active={activeProductTab} onChange={handleProductTabChange} />
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag size={32} className="text-warm-300 mx-auto mb-3" />
            <p className="text-warm-400 text-sm font-medium">No products yet</p>
            <p className="text-warm-300 text-xs mt-1">Check back soon — artisans are adding their work</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products.slice(0, 8).map((p) => <FeaturedProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* ── TOP ARTISANS ── */}
      <section className="mt-10 px-4">
        <SectionHeader
          eyebrow="MEET THE MAKERS"
          title="Top Artisans"
          subtitle="Get to know the talented craftspeople behind your favorite products."
          onSeeAll={() => navigate('/browse')}
          seeAllLabel="Discover All Artisans"
        />
        {pageLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
          </div>
        ) : sellers.length === 0 ? (
          <p className="text-warm-400 text-sm text-center py-8">No artisans yet</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {sellers.map((s) => <SellerCard key={s.id} seller={s} />)}
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => navigate('/browse')}
                className="inline-flex items-center gap-2 px-6 py-2.5 border border-beige-200 bg-white
                  text-sm font-semibold text-warm-800 rounded-full hover:border-sage-400 hover:text-sage-700
                  transition-all duration-200 shadow-sm"
              >
                Discover All Artisans <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </section>
        
      {/* ── HOW IT WORKS ── */}
      <section className="mt-10 px-4 ">
        <div className="text-center mb-10">
        <h2
          className="text-3xl md:text-4xl text-warm-900 mb-3 leading-tight"
          style={{ fontFamily: "'Amiri', serif", fontWeight: 400 }}
        >
          How it Works?
        </h2>
        </div>
        <div className="grid grid-cols-3 gap-3 ">
          {[
            { step: '01',  title: 'Browse',  desc: 'Explore handcrafted products'   },
            { step: '02',  title: 'Request', desc: 'Send your custom order details'  },
            { step: '03',  title: 'Receive', desc: 'Get your unique handmade piece'  },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-2xl p-3 border border-beige-200 text-center">
              <span className="text-2xl block mb-1.5">{item.emoji}</span>
              <p className="text-[18px] font-bold text-sage-600 mb-0.5">{item.step}</p>
              <p className="text-[16px] font-semibold text-warm-800 mb-0.5">{item.title}</p>
              <p className="text-[14px] text-warm-400 leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SELLER CTA ── */}
      <section className="mt-6 mx-4 mb-4">
        <div
          onClick={() => navigate('/register')}
          className="bg-gradient-to-r from-sage-500 to-sage-700 rounded-3xl p-6 cursor-pointer hover:opacity-95 transition-opacity"
        >
          <p className="text-white/70 text-xs mb-1">Are you an artisan?</p>
          <p className="text-white text-lg font-bold mb-3 leading-tight">
            Sell your crafts to<br />thousands of buyers
          </p>
          <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
            Create your shop <ArrowRight size={12} />
          </div>
        </div>
      </section>

    </div>
  );
}