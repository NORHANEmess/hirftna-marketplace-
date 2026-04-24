import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { categoriesAPI, extractApiItems, extractApiPagination, productsAPI } from '../services/api';
import ProductCard from '../components/product/ProductCard';
import { ProductCardSkeleton } from '../components/product/ProductCard';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

const CATEGORY_ICONS = {
  jewelry: '💍',
  pottery: '🏺',
  textiles: '🧵',
  paintings: '🎨',
  'leather-goods': '👜',
  'candles-soap': '🕯️',
  'food-honey': '🍯',
  'home-decor': '🏡',
  embroidery: '🪡',
  woodwork: '🪵',
  other: '✨',
};

const LIMIT = 12;

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

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest');
  const [minPrice, setMinPrice] = useState(searchParams.get('min') ?? '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const isLoadMore = useRef(false);

  useEffect(() => {
    categoriesAPI.getAll()
      .then((response) => {
        setCategories(extractApiItems(response, { itemKeys: ['categories'] }));
      })
      .catch(() => setCategories([]));
  }, []);

  const fetchProducts = useCallback(async (nextPage = 1, append = false) => {
    setLoading(true);

    try {
      const response = await productsAPI.getAll({
        page: nextPage,
        limit: LIMIT,
        sort,
        search: search.trim() || undefined,
        category_id: categoryId || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
      });

      const nextProducts = extractApiItems(response, { itemKeys: ['products'] });
      const pagination = extractApiPagination(response, { itemKeys: ['products'] });

      setProducts((current) => append ? [...current, ...nextProducts] : nextProducts);
      setTotal(pagination?.total ?? nextProducts.length);
    } catch {
      if (!append) {
        setProducts([]);
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

    if (search.trim()) {
      params.search = search.trim();
    }
    if (categoryId) {
      params.category = categoryId;
    }
    if (sort !== 'newest') {
      params.sort = sort;
    }
    if (minPrice) {
      params.min = minPrice;
    }
    if (maxPrice) {
      params.max = maxPrice;
    }

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

  const hasActiveFilters = Boolean(search.trim() || categoryId || sort !== 'newest' || minPrice || maxPrice);
  const activeCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId]
  );
  const hasMore = !loading && products.length < total;

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100 px-4 py-3 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white border border-beige-200 rounded-2xl px-3 py-2.5 focus-within:border-sage-400 transition-colors">
            <Search size={15} className="text-sage-500 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
            onClick={() => setShowFilters((current) => !current)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-sm font-medium transition-all
              ${showFilters
                ? 'bg-sage-500 text-white border-sage-500'
                : 'bg-white text-warm-700 border-beige-200 hover:border-sage-300'
              }`}
          >
            <SlidersHorizontal size={14} />
            Filter
            {hasActiveFilters && <span className="w-1.5 h-1.5 bg-warning rounded-full" />}
          </button>
        </form>

        {showFilters && (
          <div className="space-y-3 pb-1">
            <div>
              <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-2">Sort By</p>
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map((option) => (
                  <FilterPill
                    key={option.value}
                    label={option.label}
                    active={sort === option.value}
                    onClick={() => setSort(option.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-2">Category</p>
              <div className="flex flex-wrap gap-1.5">
                <FilterPill label="All" active={!categoryId} onClick={() => setCategoryId('')} />
                {categories.map((category) => (
                  <FilterPill
                    key={category.id}
                    label={`${CATEGORY_ICONS[category.slug] ?? '✨'} ${category.name}`}
                    active={categoryId === category.id}
                    onClick={() => setCategoryId(categoryId === category.id ? '' : category.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-2">Price Range (DA)</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-2 text-sm bg-white border border-beige-200 rounded-xl outline-none focus:border-sage-400 transition-colors"
                />
                <span className="self-center text-warm-400 text-sm">–</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-2 text-sm bg-white border border-beige-200 rounded-xl outline-none focus:border-sage-400 transition-colors"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button type="button" onClick={clearAllFilters} className="text-xs text-danger hover:underline font-medium">
                Clear all filters
              </button>
            )}
          </div>
        )}

        {!showFilters && hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 items-center">
            {activeCategory && (
              <ActiveFilterTag
                label={`${CATEGORY_ICONS[activeCategory.slug] ?? '✨'} ${activeCategory.name}`}
                onRemove={() => setCategoryId('')}
              />
            )}
            {sort !== 'newest' && (
              <ActiveFilterTag
                label={SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort}
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
                onRemove={() => {
                  setMinPrice('');
                  setMaxPrice('');
                }}
              />
            )}
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-1">
        <p className="text-xs text-warm-400">
          {loading && products.length === 0 ? 'Loading...' : `${total} product${total !== 1 ? 's' : ''} found`}
        </p>
      </div>

      <div className="px-4 pb-4">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
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
              Load More <ChevronDown size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
