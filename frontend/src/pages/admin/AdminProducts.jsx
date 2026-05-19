import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2, ExternalLink, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { adminAPI, categoriesAPI, resolveApiError } from '../../services/api';
import DashboardSidebar from '../../components/layout/DashboardSidebar';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const debounceRef = useRef(null);

  // Load categories once
  useEffect(() => {
    categoriesAPI.getAll()
      .then((res) => setCategories(res.data?.data?.categories || []))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback((params) => {
    setLoading(true);
    setError(null);
    adminAPI.getProducts({ ...params, limit: 20 })
      .then((res) => {
        const data = res.data?.data;
        setProducts(data?.products || data?.items || []);
        setPagination(data?.pagination || null);
      })
      .catch((err) => {
        const { message } = resolveApiError(err);
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProducts({
        page,
        search: search || undefined,
        category: categoryFilter || undefined,
      });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [page, search, categoryFilter, fetchProducts]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCategoryFilter = (e) => {
    setCategoryFilter(e.target.value);
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminAPI.deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      const { message } = resolveApiError(err);
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      <DashboardSidebar role="admin" />
      <div className="flex-1 pb-28 md:pb-10">
      {/* Header */}
      <div className="bg-white border-b border-beige-200 px-4 pt-6 pb-4">
        <Link to="/admin" className="text-xs text-sage-600 hover:text-sage-700 mb-2 inline-block">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-warm-900">Products</h1>
        {pagination && (
          <p className="text-xs text-warm-400 mt-1">{pagination.total} total products</p>
        )}
      </div>

      {/* Filters */}
      <div className="px-4 py-3 bg-white border-b border-beige-100 space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-300" />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-beige-200 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={handleCategoryFilter}
            className="w-full px-3 py-2 text-sm rounded-xl border border-beige-200 bg-cream-50 text-warm-700 focus:outline-none focus:ring-2 focus:ring-sage-300"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-beige-200 p-4 flex gap-3 animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-beige-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-beige-200 rounded w-2/3" />
                  <div className="h-2.5 bg-beige-100 rounded w-1/3" />
                  <div className="h-2.5 bg-beige-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-warm-400">
            <p className="text-base font-medium">No products found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => {
              const coverImage = product.cover?.find((img) => img.position === 0) || product.cover?.[0];
              const image = coverImage?.image_url;
              const priceLabel = product.price
                ? `${Number(product.price).toLocaleString()} DA`
                : product.price_min
                  ? `From ${Number(product.price_min).toLocaleString()} DA`
                  : 'Price on request';

              return (
                <div key={product.id} className="bg-white rounded-2xl border border-beige-200 p-4 flex gap-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-beige-100 flex-shrink-0 overflow-hidden">
                    {image ? (
                      <img src={image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-beige-200" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-warm-900 truncate">{product.name}</p>
                    <p className="text-xs text-warm-400 truncate">{product.seller?.shop_name || 'Unknown seller'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-warm-600">{priceLabel}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${product.is_active ? 'bg-sage-50 text-sage-700' : 'bg-beige-100 text-warm-500'}`}>
                        {product.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Link
                      to={`/products/${product.id}`}
                      target="_blank"
                      className="p-1.5 rounded-lg text-warm-400 hover:text-sage-600 hover:bg-sage-50 transition-colors"
                      title="View product"
                    >
                      <ExternalLink size={14} />
                    </Link>
                    <button
                      onClick={() => setDeleteTarget(product)}
                      className="p-1.5 rounded-lg text-warm-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-beige-200 text-warm-500 hover:bg-beige-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-warm-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-beige-200 text-warm-500 hover:bg-beige-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-warm-900">Delete Product?</h3>
            </div>
            <p className="text-sm text-warm-600 mb-5">
              "<span className="font-medium">{deleteTarget.name}</span>" will be permanently removed. This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-beige-200 text-sm text-warm-700 hover:bg-beige-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
