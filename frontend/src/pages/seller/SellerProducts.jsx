import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Package,
  CheckCircle2, AlertCircle, X, Upload, Loader2,
} from 'lucide-react';
import { productsAPI, uploadsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(val) {
  if (!val) return '';
  return `DZD ${Number(val).toLocaleString()}`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-24 md:bottom-6 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium
      ${type === 'success' ? 'bg-sage-500 text-white' : 'bg-danger text-white'}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose}><X size={14} className="opacity-70 hover:opacity-100" /></button>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
      ${active ? 'bg-sage-100 text-sage-700' : 'bg-cream-200 text-warm-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-sage-500' : 'bg-warm-300'}`} />
      {active ? 'Active' : 'Hidden'}
    </span>
  );
}

// ─── Image Uploader ───────────────────────────────────────────────────────────
function ImageUploader({ images, onChange, maxImages = 3 }) {
  const inputRef  = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files) {
    if (!files.length) return;
    setUploading(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).slice(0, maxImages - images.length).map(async (file) => {
          const form = new FormData();
          form.append('image', file);
          const res = await uploadsAPI.uploadImage(form);
          return res.data?.data?.url ?? res.data?.url ?? '';
        })
      );
      onChange([...images, ...uploads.filter(Boolean)]);
    } catch {
      /* handled by parent */
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Preview strip */}
      <div className="flex gap-2 flex-wrap">
        {images.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-beige-200 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        ))}

        {/* Add slot */}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-beige-200 hover:border-sage-400
              flex flex-col items-center justify-center gap-1 text-warm-400 hover:text-sage-500 transition-colors"
          >
            {uploading
              ? <Loader2 size={18} className="animate-spin" />
              : <><Upload size={16} /><span className="text-[9px] font-medium">Upload</span></>
            }
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-[10px] text-warm-400">Max {maxImages} images • JPG, PNG, WebP</p>
    </div>
  );
}

// ─── Product Form Modal ───────────────────────────────────────────────────────
const CATEGORIES_STATIC = [
  { slug: 'jewelry',       name: 'Jewelry'       },
  { slug: 'pottery',       name: 'Pottery'       },
  { slug: 'textiles',      name: 'Textiles'      },
  { slug: 'paintings',     name: 'Paintings'     },
  { slug: 'leather-goods', name: 'Leather Goods' },
  { slug: 'candles-soap',  name: 'Candles & Soap'},
  { slug: 'food-honey',    name: 'Food & Honey'  },
  { slug: 'home-decor',    name: 'Home Decor'    },
  { slug: 'other',         name: 'Other'         },
];

const EMPTY_FORM = {
  name: '', description: '', price: '', price_min: '', price_max: '',
  category_id: '', completion_days: '', images: [], is_active: true,
};

function ProductFormModal({ product, categories, onClose, onSaved }) {
  const isEdit = !!product;
  const [form,    setForm]    = useState(
    isEdit
      ? {
          name:            product.name            ?? '',
          description:     product.description     ?? '',
          price:           product.price           ?? '',
          price_min:       product.price_min       ?? '',
          price_max:       product.price_max       ?? '',
          category_id:     product.category_id     ?? '',
          completion_days: product.completion_days ?? '',
          images:          (product.product_images ?? []).map(i => i.image_url).filter(Boolean),
          is_active:       product.is_active       ?? true,
        }
      : { ...EMPTY_FORM }
  );
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  function validate() {
    const e = {};
    if (!form.name.trim())        e.name        = 'Product name is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.price)              e.price       = 'Base price is required';
    if (!form.category_id)        e.category_id = 'Select a category';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    // Build payload matching backend schema
    const payload = {
      name:            form.name.trim(),
      description:     form.description.trim(),
      price:           Number(form.price),
      price_min:       form.price_min  ? Number(form.price_min)  : undefined,
      price_max:       form.price_max  ? Number(form.price_max)  : undefined,
      category_id:     form.category_id,
      completion_days: form.completion_days ? Number(form.completion_days) : undefined,
      is_active:       form.is_active,
      images:          form.images,  // array of URLs
    };

    try {
      if (isEdit) {
        await productsAPI.update(product.id, payload);
      } else {
        await productsAPI.create(payload);
      }
      onSaved();
    } catch (err) {
      setErrors({ global: err?.response?.data?.message ?? 'Failed to save product' });
    } finally {
      setSaving(false);
    }
  }

  const cats = categories.length ? categories : CATEGORIES_STATIC;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-beige-200 rounded-full" />
        </div>

        <div className="px-6 pt-4 pb-8 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-warm-900">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center hover:bg-beige-200 transition-colors">
              <X size={16} className="text-warm-600" />
            </button>
          </div>

          {errors.global && (
            <div className="bg-red-50 border border-red-100 text-danger text-sm rounded-2xl px-4 py-3">
              {errors.global}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">Product Name *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Handwoven Berber Rug"
                className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 transition-colors
                  ${errors.name ? 'border-danger' : 'border-beige-200'}`}
              />
              {errors.name && <p className="text-[10px] text-danger mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">Description *</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Describe your product, materials, dimensions..."
                rows={3}
                className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 transition-colors resize-none
                  ${errors.description ? 'border-danger' : 'border-beige-200'}`}
              />
              {errors.description && <p className="text-[10px] text-danger mt-1">{errors.description}</p>}
            </div>

            {/* Prices */}
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">Pricing (DZD) *</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder="Base"
                    className={`w-full px-3 py-2.5 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 transition-colors
                      ${errors.price ? 'border-danger' : 'border-beige-200'}`}
                  />
                  <p className="text-[9px] text-warm-400 mt-1 text-center">Base *</p>
                </div>
                <div>
                  <input type="number" value={form.price_min} onChange={e => set('price_min', e.target.value)}
                    placeholder="Min" className="w-full px-3 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400 transition-colors" />
                  <p className="text-[9px] text-warm-400 mt-1 text-center">Min Range</p>
                </div>
                <div>
                  <input type="number" value={form.price_max} onChange={e => set('price_max', e.target.value)}
                    placeholder="Max" className="w-full px-3 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400 transition-colors" />
                  <p className="text-[9px] text-warm-400 mt-1 text-center">Max Range</p>
                </div>
              </div>
              {errors.price && <p className="text-[10px] text-danger mt-1">{errors.price}</p>}
            </div>

            {/* Category + Completion days */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-warm-600 mb-1.5">Category *</label>
                <select
                  value={form.category_id}
                  onChange={e => set('category_id', e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 transition-colors
                    ${errors.category_id ? 'border-danger' : 'border-beige-200'}`}
                >
                  <option value="">Select...</option>
                  {cats.map(c => (
                    <option key={c.id ?? c.slug} value={c.id ?? c.slug}>{c.name}</option>
                  ))}
                </select>
                {errors.category_id && <p className="text-[10px] text-danger mt-1">{errors.category_id}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 mb-1.5">Completion (days)</label>
                <input
                  type="number"
                  value={form.completion_days}
                  onChange={e => set('completion_days', e.target.value)}
                  placeholder="e.g. 7"
                  className="w-full px-3 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400 transition-colors"
                />
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-xs font-semibold text-warm-600 mb-1.5">Product Images</label>
              <ImageUploader
                images={form.images}
                onChange={urls => set('images', urls)}
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between py-3 px-4 bg-cream-100 rounded-2xl border border-beige-200">
              <div>
                <p className="text-sm font-semibold text-warm-800">Visible to buyers</p>
                <p className="text-[10px] text-warm-400">Toggle to show or hide this product</p>
              </div>
              <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                className={`w-11 h-6 rounded-full transition-colors duration-200 relative
                  ${form.is_active ? 'bg-sage-500' : 'bg-beige-200'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200
                  ${form.is_active ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-sage-500 hover:bg-sage-600 text-white font-semibold text-sm rounded-2xl
                transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ product, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await productsAPI.delete(product.id);
      onDeleted();
    } catch { /* toast handled outside */ }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl space-y-4">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
          <Trash2 size={22} className="text-danger" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold text-warm-900 mb-1">Delete Product?</h3>
          <p className="text-sm text-warm-400">
            "<span className="text-warm-700 font-medium">{product.name}</span>" will be permanently removed.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-cream-200 text-warm-700 text-sm font-semibold rounded-2xl hover:bg-beige-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 py-2.5 bg-danger text-white text-sm font-semibold rounded-2xl hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Row Card ─────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete, onToggle }) {
  const [toggling, setToggling] = useState(false);
  const image = product.product_images?.[0]?.image_url ?? product.image_url ?? null;

  async function handleToggle() {
    setToggling(true);
    await onToggle(product);
    setToggling(false);
  }

  return (
    <div className="bg-white border border-beige-200 rounded-2xl p-4 flex items-center gap-4 hover:border-sage-200 hover:shadow-sm transition-all">
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-cream-200 flex-shrink-0">
        {image
          ? <img src={image} alt={product.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🧶</div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-warm-900 truncate">{product.name}</p>
          <StatusBadge active={product.is_active} />
        </div>
        <p className="text-xs text-warm-400 truncate mb-1.5">{product.description}</p>
        <div className="flex items-center gap-3 text-xs text-warm-500">
          <span className="font-semibold text-warm-800">{formatPrice(product.price_min ?? product.price)}</span>
          {product.completion_days && <span>⏱ {product.completion_days}d</span>}
          {product.avg_rating > 0 && <span>★ {Number(product.avg_rating).toFixed(1)}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Toggle visibility */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="w-8 h-8 rounded-xl bg-cream-200 hover:bg-beige-200 flex items-center justify-center transition-colors disabled:opacity-50"
          title={product.is_active ? 'Hide product' : 'Show product'}
        >
          {toggling ? <Loader2 size={14} className="animate-spin text-warm-400" /> : product.is_active ? <Eye size={14} className="text-sage-600" /> : <EyeOff size={14} className="text-warm-400" />}
        </button>
        {/* Edit */}
        <button onClick={() => onEdit(product)}
          className="w-8 h-8 rounded-xl bg-cream-200 hover:bg-beige-200 flex items-center justify-center transition-colors">
          <Pencil size={14} className="text-warm-600" />
        </button>
        {/* Delete */}
        <button onClick={() => onDelete(product)}
          className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
          <Trash2 size={14} className="text-danger" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SellerProducts() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [products,     setProducts]     = useState([]);
  const [categories,   setCategories]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null); // 'add' | product object | null
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast,        setToast]        = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  // Load seller's products
  async function loadProducts() {
    setLoading(true);
    try {
      const res  = await productsAPI.getMyProducts();
      const data = res.data?.data;
      setProducts(Array.isArray(data) ? data : (data?.products ?? []));
    } catch {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducts(); }, []);

  async function handleToggle(product) {
    try {
      await productsAPI.update(product.id, { is_active: !product.is_active });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p));
      showToast(product.is_active ? 'Product hidden' : 'Product is now visible');
    } catch {
      showToast('Failed to update product', 'error');
    }
  }

  async function handleDelete(product) {
    try {
      await productsAPI.delete(product.id);
      setProducts(prev => prev.filter(p => p.id !== product.id));
      setDeleteTarget(null);
      showToast('Product deleted');
    } catch {
      showToast('Failed to delete product', 'error');
    }
  }

  function handleSaved() {
    setModal(null);
    loadProducts();
    showToast(modal === 'add' ? 'Product added!' : 'Product updated!');
  }

  const activeCount = products.filter(p => p.is_active).length;

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">
      {/* ── Header ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-warm-900">My Products</h1>
            <p className="text-xs text-warm-400">
              {loading ? 'Loading...' : `${products.length} total · ${activeCount} active`}
            </p>
          </div>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2.5 bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold rounded-2xl transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-beige-200 rounded-2xl animate-pulse" />
          ))
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-cream-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-warm-300" />
            </div>
            <p className="text-warm-800 font-semibold mb-1">No products yet</p>
            <p className="text-warm-400 text-sm mb-6">Add your first handmade product to start selling</p>
            <button
              onClick={() => setModal('add')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white text-sm font-semibold rounded-2xl hover:bg-sage-600 transition-colors"
            >
              <Plus size={16} /> Add Your First Product
            </button>
          </div>
        ) : (
          products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={setModal}
              onDelete={setDeleteTarget}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>

      {/* ── Modals ── */}
      {(modal === 'add' || (modal && modal !== 'add')) && (
        <ProductFormModal
          product={modal === 'add' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
            setDeleteTarget(null);
            showToast('Product deleted');
          }}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}