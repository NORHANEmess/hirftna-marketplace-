import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, AlertTriangle, Loader2, Tag } from 'lucide-react';
import { categoriesAPI, resolveApiError } from '../../services/api';
import { useTranslation } from '../../i18n/index.jsx';
import DashboardSidebar from '../../components/layout/DashboardSidebar';

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

const EMPTY_FORM = { name: '', slug: '', icon_url: '' };

export default function AdminCategories() {
  const { t } = useTranslation();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'delete'
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [slugManual, setSlugManual] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCategories = useCallback(() => {
    setLoading(true);
    setError(null);
    categoriesAPI.getAll()
      .then((res) => {
        const data = res.data?.data;
        setCategories(Array.isArray(data) ? data : data?.categories || []);
      })
      .catch((err) => {
        const { message } = resolveApiError(err);
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSlugManual(false);
    setModalMode('create');
  };

  const openEdit = (category) => {
    setForm({
      name: category.name,
      slug: category.slug,
      icon_url: category.icon_url || '',
    });
    setFormErrors({});
    setSlugManual(true);
    setEditTarget(category);
    setModalMode('edit');
  };

  const openDelete = (category) => {
    setDeleteTarget(category);
    setDeleteError(null);
    setModalMode('delete');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const handleNameChange = (value) => {
    const next = { ...form, name: value };
    if (!slugManual) next.slug = slugify(value);
    setForm(next);
  };

  const handleSlugChange = (value) => {
    setSlugManual(true);
    setForm({ ...form, slug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = t('validation.required');
    if (!form.slug.trim()) errors.slug = t('validation.required');
    else if (!/^[a-z0-9-]+$/.test(form.slug))
      errors.slug = 'Slug must be lowercase letters, numbers, and hyphens only';
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    setFormErrors({});
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        ...(form.icon_url.trim() && { icon_url: form.icon_url.trim() }),
      };
      if (modalMode === 'create') {
        await categoriesAPI.create(payload);
        showToast('success', t('admin.categories.createSuccess'));
      } else {
        await categoriesAPI.update(editTarget.id, payload);
        showToast('success', t('admin.categories.updateSuccess'));
      }
      closeModal();
      fetchCategories();
    } catch (err) {
      const { message } = resolveApiError(err);
      setFormErrors({ submit: message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await categoriesAPI.delete(deleteTarget.id);
      showToast('success', t('admin.categories.deleteSuccess'));
      closeModal();
      fetchCategories();
    } catch (err) {
      const { message } = resolveApiError(err);
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  const isFormModal = modalMode === 'create' || modalMode === 'edit';

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      <DashboardSidebar role="admin" />
      <div className="flex-1 pb-28 md:pb-10">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-sage-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-beige-200 px-4 pt-6 pb-4">
        <Link to="/admin" className="text-xs text-sage-600 hover:text-sage-700 mb-2 inline-block">
          ← Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-warm-900">{t('admin.categories.title')}</h1>
            {!loading && (
              <p className="text-xs text-warm-400 mt-1">{categories.length} total</p>
            )}
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-xl hover:bg-sage-700 transition-colors"
          >
            <Plus size={15} />
            {t('admin.categories.create')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-beige-200 p-4 animate-pulse flex items-center gap-4"
              >
                <div className="h-4 bg-beige-200 rounded w-1/4" />
                <div className="h-3 bg-beige-100 rounded w-1/5" />
                <div className="h-3 bg-beige-100 rounded w-1/6 ml-auto" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-beige-100 flex items-center justify-center mx-auto mb-3">
              <Tag size={24} className="text-warm-300" />
            </div>
            <p className="text-base font-medium text-warm-600">{t('admin.categories.noCategories')}</p>
            <button
              onClick={openCreate}
              className="mt-3 text-sm text-sage-600 hover:text-sage-700 font-medium"
            >
              {t('admin.categories.create')} →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-beige-100 text-xs text-warm-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">{t('admin.categories.name')}</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">
                      {t('admin.categories.slug')}
                    </th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                      {t('admin.categories.iconUrl')}
                    </th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                      {t('admin.categories.createdAt')}
                    </th>
                    <th className="text-right px-4 py-3 font-medium">{t('admin.categories.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="border-b border-beige-50 last:border-0 hover:bg-cream-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-warm-900">{cat.name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-warm-400 font-mono bg-beige-50 px-2 py-0.5 rounded-lg">
                          {cat.slug}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {cat.icon_url ? (
                          <span className="text-xs text-warm-400 font-mono truncate max-w-[200px] inline-block">
                            {cat.icon_url}
                          </span>
                        ) : (
                          <span className="text-xs text-warm-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-warm-400 hidden md:table-cell">
                        {cat.created_at
                          ? new Date(cat.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(cat)}
                            className="p-1.5 rounded-lg text-warm-400 hover:text-sage-600 hover:bg-sage-50 transition-colors"
                            title={t('admin.categories.edit')}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => openDelete(cat)}
                            className="p-1.5 rounded-lg text-warm-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title={t('admin.categories.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isFormModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-base font-semibold text-warm-900 mb-4">
              {modalMode === 'create' ? t('admin.categories.create') : t('admin.categories.edit')}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-warm-700 mb-1">
                  {t('admin.categories.name')}{' '}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Pottery"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-beige-200 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-300 text-warm-900"
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-medium text-warm-700 mb-1">
                  {t('admin.categories.slug')}{' '}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="e.g. pottery"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-beige-200 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-300 text-warm-900 font-mono"
                />
                {formErrors.slug && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.slug}</p>
                )}
              </div>

              {/* Icon URL */}
              <div>
                <label className="block text-xs font-medium text-warm-700 mb-1">
                  {t('admin.categories.iconUrl')}{' '}
                  <span className="text-xs text-warm-300">({t('common.optional')})</span>
                </label>
                <input
                  type="text"
                  value={form.icon_url}
                  onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-beige-200 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-300 text-warm-900"
                />
              </div>

              {formErrors.submit && (
                <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
                  {formErrors.submit}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-beige-200 text-sm text-warm-700 hover:bg-beige-50 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-sage-600 text-sm text-white font-medium hover:bg-sage-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modalMode === 'delete' && deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <h3 className="text-base font-semibold text-warm-900">
                {t('admin.categories.confirmDelete')}
              </h3>
            </div>
            <p className="text-sm text-warm-600 mb-2">
              "<span className="font-medium">{deleteTarget.name}</span>"
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">
              {t('admin.categories.deleteWarning')}
            </p>
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-beige-200 text-sm text-warm-700 hover:bg-beige-50 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {deleting ? t('common.saving') : t('admin.categories.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
