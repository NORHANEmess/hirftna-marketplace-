import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BadgeCheck, ChevronDown, LayoutGrid, PackageOpen, Search, SlidersHorizontal, X } from 'lucide-react';
import { categoriesAPI, extractApiItems, extractApiPagination, productsAPI, promotionsAPI } from '../services/api';
import ProductCard from '../components/product/ProductCard';
import { ProductCardSkeleton } from '../components/product/ProductCard';
import { getCategoryIcon } from '../utils/categoryIcons';
import { useTranslation } from '../i18n/index.jsx';

const LIMIT = 12;

// ─── Category Pills ───────────────────────────────────────────────────────────
function CategoryPills({ categories, activeId, onSelect }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
      <button
        type="button"
        onClick={() => onSelect('')}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all whitespace-nowrap
          ${!activeId
            ? 'bg-sage-500 text-white border-sage-500 shadow-sm'
            : 'bg-white text-warm-600 border-beige-200 hover:border-sage-300'
          }`}
      >
        <LayoutGrid size={13} />
        {t('browse.allCategories')}
      </button>
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.slug);
        const isActive = activeId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(isActive ? '' : cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all whitespace-nowrap
              ${isActive
                ? 'bg-sage-500 text-white border-sage-500 shadow-sm'
                : 'bg-white text-warm-600 border-beige-200 hover:border-sage-300'
              }`}
          >
            <Icon size={13} />
            {t(`categories.${cat.name}`, cat.name)}
          </button>
        );
      })}
    </div>
  );
}

// ─── Promoted Sellers Strip ───────────────────────────────────────────────────
function PromotedSellersStrip({ ads }) {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  if (!ads || ads.length === 0) return null;
  return (
    <div className="px-4 pt-3 pb-2">
      <p className="text-[10px] font-bold tracking-[0.18em] text-sage-500 uppercase mb-2">
        {t('promotions.featuredSellers')}
      </p>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
        {ads.map(({ id, seller }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(`/sellers/${seller.id}`)}
            className="flex-shrink-0 flex items-center gap-2 bg-white border border-sage-200 rounded-2xl px-3 py-2 hover:border-sage-400 hover:shadow-sm transition-all"
          >
            {seller.avatar_url ? (
              <img src={seller.avatar_url} alt={seller.shop_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{seller.shop_name?.charAt(0)?.toUpperCase()}</span>
              </div>
            )}
            <div className="text-start">
              <div className="flex items-center gap-1">
                <p className="text-xs font-semibold text-warm-800 max-w-[100px] truncate">{seller.shop_name}</p>
                {seller.is_verified && <BadgeCheck size={11} className="text-sage-500 flex-shrink-0" />}
              </div>
              {seller.category?.name && (
                <p className="text-[9px] text-warm-400">{t(`categories.${seller.category?.name}`, seller.category?.name)}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-all duration-150 flex-shrink-0
        ${active
          ? 'bg-sage-500 text-white border-sage-500 shadow-sm'
          : 'bg-white text-warm-600 border-beige-200 hover:border-sage-300'
        }`}
    >
      {label}
    </button>
  );
}

function ActiveFilterTag({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-sage-50 text-sage-700 border border-sage-200 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
      {label}
      <button type="button" onClick={onRemove} className="hover:text-danger transition-colors ml-0.5">
        <X size={10} />
      </button>
    </span>
  );
}

function EmptyState({ hasFilters }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-beige-100 flex items-center justify-center mx-auto mb-4">
        <PackageOpen size={28} className="text-warm-400" />
      </div>
      <p className="text-warm-700 font-semibold mb-1">{t('browse.noResults')}</p>
      <p className="text-warm-400 text-sm">
        {hasFilters ? t('browse.noResultsFiltered') : t('browse.noResults')}
      </p>
    </div>
  );
}

export default function BrowsePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const SORT_OPTIONS = useMemo(() => ([
    { value: 'newest',     label: t('browse.sort.newest') },
    { value: 'price_asc',  label: t('browse.sort.price_asc') },
    { value: 'price_desc', label: t('browse.sort.price_desc') },
    { value: 'rating',     label: t('browse.sort.rating') },
  ]), [t]);

  const [search,     setSearch]     = useState(searchParams.get('search')   ?? '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') ?? '');
  const [sort,       setSort]       = useState(searchParams.get('sort')      ?? 'newest');
  const [minPrice,   setMinPrice]   = useState(searchParams.get('min')       ?? '');
  const [maxPrice,   setMaxPrice]   = useState(searchParams.get('max')       ?? '');
  const [showFilters,  setShowFilters]  = useState(false);
  const [categories,   setCategories]   = useState([]);
  const [products,     setProducts]     = useState([]);
  const [browseAds,    setBrowseAds]    = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(false);
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);
  const isLoadMore = useRef(false);

  useEffect(() => {
    categoriesAPI.getAll()
      .then((response) => {
        setCategories(extractApiItems(response, { itemKeys: ['categories'] }));
      })
      .catch(() => setCategories([]));
    promotionsAPI.getBrowseAds()
      .then((res) => setBrowseAds(res.data?.data?.ads ?? []))
      .catch(() => setBrowseAds([]));
  }, []);

  useEffect(() => {
    const params = categoryId ? { category_id: categoryId } : {};
    promotionsAPI.getFeaturedProducts(params)
      .then((res) => setFeaturedProducts(res.data?.data?.products ?? []))
      .catch(() => setFeaturedProducts([]));
  }, [categoryId]);

  const fetchProducts = useCallback(async (nextPage = 1, append = false) => {
    setLoading(true);
    if (!append) setFetchError(false);
    try {
      const response = await productsAPI.getAll({
        page: nextPage,
        limit: LIMIT,
        sort,
        search:     search.trim() || undefined,
        category_id: categoryId  || undefined,
        min_price:   minPrice    || undefined,
        max_price:   maxPrice    || undefined,
      });
      const nextProducts = extractApiItems(response, { itemKeys: ['products'] });
      const pagination   = extractApiPagination(response, { itemKeys: ['products'] });
      setProducts((current) => append ? [...current, ...nextProducts] : nextProducts);
      setTotal(pagination?.total ?? nextProducts.length);
    } catch {
      if (!append) {
        setProducts([]);
        setFetchError(true);
      }
    } finally {
      setLoading(false);
      isLoadMore.current = false;
    }
  }, [categoryId, maxPrice, minPrice, search, sort]);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, false);
  }, [fetchProducts]);

  useEffect(() => {
    const params = {};
    if (search.trim())       params.search   = search.trim();
    if (categoryId)          params.category = categoryId;
    if (sort !== 'newest')   params.sort     = sort;
    if (minPrice)            params.min      = minPrice;
    if (maxPrice)            params.max      = maxPrice;
    setSearchParams(params, { replace: true });
  }, [categoryId, maxPrice, minPrice, search, setSearchParams, sort]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    fetchProducts(1, false);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    isLoadMore.current = true;
    setPage(nextPage);
    fetchProducts(nextPage, true);
  };

  const clearAllFilters = () => {
    setSearch('');
    setCategoryId('');
    setSort('newest');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const hasActiveFilters  = Boolean(search.trim() || categoryId || sort !== 'newest' || minPrice || maxPrice);
  const activeCategory    = useMemo(() => categories.find((c) => c.id === categoryId) ?? null, [categories, categoryId]);
  const hasMore           = !loading && products.length < total;
  const organicProducts   = products.filter((p) => !featuredProducts.some((fp) => fp.id === p.id));

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Sticky toolbar ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100 px-4 pt-3 pb-2 space-y-2.5">

        {/* Row 1 — search + filter toggle */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white border border-beige-200 rounded-2xl px-3 py-2.5 focus-within:border-sage-400 transition-colors">
            <Search size={15} className="text-sage-500 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('browse.searchPlaceholder')}
              className="flex-1 text-sm text-warm-800 placeholder-warm-400 outline-none bg-transparent min-w-0"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X size={13} className="text-warm-400 hover:text-warm-700" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-sm font-medium transition-all
              ${showFilters
                ? 'bg-sage-500 text-white border-sage-500'
                : 'bg-white text-warm-700 border-beige-200 hover:border-sage-300'
              }`}
          >
            <SlidersHorizontal size={14} />
            {t('browse.filter')}
            {hasActiveFilters && <span className="w-1.5 h-1.5 bg-warning rounded-full" />}
          </button>
        </form>

        {/* Row 2 — category pills (always visible) */}
        {categories.length > 0 && (
          <CategoryPills categories={categories} activeId={categoryId} onSelect={setCategoryId} />
        )}

        {/* Row 3 — filter panel (sort + price) */}
        {showFilters && (
          <div className="space-y-3 pt-0.5 pb-1">
            <div>
              <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-2">{t('browse.sortBy')}</p>
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map((opt) => (
                  <FilterPill key={opt.value} label={opt.label} active={sort === opt.value} onClick={() => setSort(opt.value)} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-2">{t('browse.priceRange')}</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder={t('browse.pricePlaceholderMin')}
                  className="w-full px-3 py-2 text-sm bg-white border border-beige-200 rounded-xl outline-none focus:border-sage-400 transition-colors"
                />
                <span className="self-center text-warm-400 text-sm">–</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder={t('browse.pricePlaceholderMax')}
                  className="w-full px-3 py-2 text-sm bg-white border border-beige-200 rounded-xl outline-none focus:border-sage-400 transition-colors"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button type="button" onClick={clearAllFilters} className="text-xs text-danger hover:underline font-medium">
                {t('browse.clearAll')}
              </button>
            )}
          </div>
        )}

        {/* Row 4 — active filter tags */}
        {!showFilters && hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {activeCategory && (
              <ActiveFilterTag label={activeCategory.name} onRemove={() => setCategoryId('')} />
            )}
            {sort !== 'newest' && (
              <ActiveFilterTag
                label={SORT_OPTIONS.find((o) => o.value === sort)?.label ?? sort}
                onRemove={() => setSort('newest')}
              />
            )}
            {search.trim() && (
              <ActiveFilterTag label={`"${search.trim()}"`} onRemove={() => setSearch('')} />
            )}
            {(minPrice || maxPrice) && (
              <ActiveFilterTag
                label={`${minPrice || '0'} – ${maxPrice || '∞'} DA`}
                onRemove={() => { setMinPrice(''); setMaxPrice(''); }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Promoted seller chips ── */}
      <PromotedSellersStrip ads={browseAds} />

      {/* ── Featured / promoted products ── */}
      {featuredProducts.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-sage-500" />
            <p className="text-[11px] font-bold tracking-[0.16em] text-sage-600 uppercase">
              {t('browse.promotedProducts')}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {featuredProducts.slice(0, 4).map((product) => (
              <ProductCard key={`featured-${product.id}`} product={product} isPromoted showRequestBtn={false} />
            ))}
          </div>
        </div>
      )}

      {/* ── Result count ── */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs text-warm-400">
          {loading && products.length === 0 ? t('common.loading') : t('browse.found', { count: total })}
        </p>
      </div>

      {/* ── Product grid ── */}
      <div className="px-4 pb-4">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : fetchError ? (
          <div className="text-center py-16">
            <PackageOpen size={36} className="text-warm-300 mx-auto mb-3" />
            <p className="text-warm-700 font-semibold mb-1">{t('common.error')}</p>
            <button
              onClick={() => fetchProducts(1, false)}
              className="mt-3 text-sm font-semibold text-sage-600 underline underline-offset-2"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : organicProducts.length === 0 && !loading ? (
          <EmptyState hasFilters={hasActiveFilters} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {organicProducts.map((product, index) => (
              <div
                key={product.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(index, 11) * 45}ms`, animationFillMode: 'both' }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}

        {loading && products.length > 0 && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-sage-300 border-t-sage-500 rounded-full animate-spin" />
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={handleLoadMore}
              className="flex items-center gap-2 px-6 py-2.5 border border-beige-200 bg-white text-sm font-semibold text-warm-800 rounded-full hover:border-sage-400 hover:text-sage-700 transition-all shadow-sm"
            >
              {t('browse.loadMore')} <ChevronDown size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
