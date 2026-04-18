import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { categoriesAPI, productsAPI } from '../services/api';
import ProductCard from '../components/product/ProductCard';
import { ProductCardSkeleton } from '../components/product/ProductCardSkeleton';

// ─── Constants ────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest'          },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'rating',     label: 'Top Rated'        },
];

const CATEGORY_ICONS = {
  jewelry:        '💍', pottery:        '🏺',
  textiles:       '🧵', paintings:      '🎨',
  'leather-goods':'👜', 'candles-soap': '🕯️',
  'food-honey':   '🍯', 'home-decor':   '🏡',
  embroidery:     '🪡', woodwork:       '🪵',
  other:          '✨',
};

const LIMIT = 12;

// ─── Sub-components ───────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap
        transition-all duration-150 flex-shrink-0
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
    <span className="inline-flex items-center gap-1 text-xs bg-sage-50 text-sage-700
      border border-sage-200 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
      {label}
      <button onClick={onRemove} className="hover:text-danger transition-colors ml-0.5">
        <X size={10} />
      </button>
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilters }) {
  return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">🧶</p>
      <p className="text-warm-700 font-semibold mb-1">No products found</p>
      <p className="text-warm-400 text-sm">
        {hasFilters ? 'Try clearing your filters' : 'No products available yet'}
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter state — hydrated from URL on mount ──
  const [search,       setSearch]       = useState(searchParams.get('q') ?? '');
  const [categorySlug, setCategorySlug] = useState(searchParams.get('category') ?? '');
  const [sort,         setSort]         = useState(searchParams.get('sort') ?? 'newest');
  const [minPrice,     setMinPrice]     = useState(searchParams.get('min') ?? '');
  const [maxPrice,     setMaxPrice]     = useState(searchParams.get('max') ?? '');
  const [showFilters,  setShowFilters]  = useState(false);

  // ── Data state ──
  const [categories,   setCategories]   = useState([]);
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const isLoadMore = useRef(false);

  // ── Load categories once ──
  useEffect(() => {
    categoriesAPI.getAll()
      .then(res => {
        const data = res.data?.data;
        setCategories(Array.isArray(data) ? data : (data?.categories ?? []));
      })
      .catch(() => {});
  }, []);

  // ── Fetch products ──
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: LIMIT, offset: (isLoadMore.current ? page - 1 : 0) * LIMIT, sort };
      if (search.trim())  params.q        = search.trim();
      if (categorySlug)   params.category = categorySlug;
      if (minPrice)       params.min      = minPrice;
      if (maxPrice)       params.max      = maxPrice;

      const res   = await productsAPI.getAll(params);
      const data  = res.data?.data;
      const items = Array.isArray(data) ? data : (data?.products ?? []);
      const count = data?.total ?? items.length;

      // Append on load-more, replace on filter change
      setProducts(prev => isLoadMore.current ? [...prev, ...items] : items);
      setTotal(count);
    } catch {
      if (!isLoadMore.current) setProducts([]);
    } finally {
      setLoading(false);
      isLoadMore.current = false;
    }
  }, [sort, search, categorySlug, minPrice, maxPrice, page]);

  // Re-fetch when filters change (reset to page 1)
  useEffect(() => {
    isLoadMore.current = false;
    setPage(1);
    fetchProducts();
  }, [sort, categorySlug, minPrice, maxPrice]); // eslint-disable-line

  // Re-fetch when page increments (load more)
  useEffect(() => {
    if (page > 1) fetchProducts();
  }, [page]); // eslint-disable-line

  // ── Sync filters → URL params ──
  useEffect(() => {
    const p = {};
    if (search.trim())       p.q        = search.trim();
    if (categorySlug)        p.category = categorySlug;
    if (sort !== 'newest')   p.sort     = sort;
    if (minPrice)            p.min      = minPrice;
    if (maxPrice)            p.max      = maxPrice;
    setSearchParams(p, { replace: true });
  }, [search, categorySlug, sort, minPrice, maxPrice]); // eslint-disable-line

  function handleSearchSubmit(e) {
    e.preventDefault();
    isLoadMore.current = false;
    setPage(1);
    fetchProducts();
  }

  function handleLoadMore() {
    isLoadMore.current = true;
    setPage(p => p + 1);
  }

  function clearAllFilters() {
    setSearch('');
    setCategorySlug('');
    setSort('newest');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  }

  const hasActiveFilters = search.trim() || categorySlug || sort !== 'newest' || minPrice || maxPrice;
  const activeCategoryName = categories.find(c => c.slug === categorySlug)?.name;
  const hasMore = !loading && products.length < total;

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Sticky Search + Filter Bar ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100 px-4 py-3 space-y-3">

        {/* Search row */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white border border-beige-200
            rounded-2xl px-3 py-2.5 focus-within:border-sage-400 transition-colors">
            <Search size={15} className="text-sage-500 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search handmade goods..."
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
            onClick={() => setShowFilters(p => !p)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-sm
              font-medium transition-all
              ${showFilters
                ? 'bg-sage-500 text-white border-sage-500'
                : 'bg-white text-warm-700 border-beige-200 hover:border-sage-300'
              }`}
          >
            <SlidersHorizontal size={14} />
            Filter
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 bg-warning rounded-full" />
            )}
          </button>
        </form>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="space-y-3 pb-1">

            {/* Sort */}
            <div>
              <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-2">Sort By</p>
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.value}
                    label={opt.label}
                    active={sort === opt.value}
                    onClick={() => setSort(opt.value)}
                  />
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-2">Category</p>
              <div className="flex flex-wrap gap-1.5">
                <FilterPill label="All" active={!categorySlug} onClick={() => setCategorySlug('')} />
                {categories.map(cat => (
                  <FilterPill
                    key={cat.id}
                    label={`${CATEGORY_ICONS[cat.slug] ?? '✨'} ${cat.name_ar ?? cat.name}`}
                    active={categorySlug === cat.slug}
                    onClick={() => setCategorySlug(categorySlug === cat.slug ? '' : cat.slug)}
                  />
                ))}
              </div>
            </div>

            {/* Price range */}
            <div>
              <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-2">
                Price Range (DA)
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-2 text-sm bg-white border border-beige-200 rounded-xl
                    outline-none focus:border-sage-400 transition-colors"
                />
                <span className="self-center text-warm-400 text-sm">–</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-2 text-sm bg-white border border-beige-200 rounded-xl
                    outline-none focus:border-sage-400 transition-colors"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-danger hover:underline font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Active filter tags (shown when panel is closed) */}
        {!showFilters && hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {categorySlug && activeCategoryName && (
              <ActiveFilterTag
                label={`${CATEGORY_ICONS[categorySlug] ?? '✨'} ${activeCategoryName}`}
                onRemove={() => setCategorySlug('')}
              />
            )}
            {sort !== 'newest' && (
              <ActiveFilterTag
                label={SORT_OPTIONS.find(o => o.value === sort)?.label ?? sort}
                onRemove={() => setSort('newest')}
              />
            )}
            {search.trim() && (
              <ActiveFilterTag
                label={`"${search.trim()}"`}
                onRemove={() => setSearch('')}
              />
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

      {/* ── Results count ── */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs text-warm-400">
          {loading && products.length === 0
            ? 'Loading...'
            : `${total} product${total !== 1 ? 's' : ''} found`
          }
        </p>
      </div>

      {/* ── Product Grid ── */}
      <div className="px-4 pb-4">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {/* Loading more */}
        {loading && products.length > 0 && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-sage-300 border-t-sage-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Load more button */}
        {hasMore && (
          <div className="flex justify-center mt-6">
            <button
              onClick={handleLoadMore}
              className="flex items-center gap-2 px-6 py-2.5 border border-beige-200 bg-white
                text-sm font-semibold text-warm-800 rounded-full hover:border-sage-400
                hover:text-sage-700 transition-all shadow-sm"
            >
              Load More <ChevronDown size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}