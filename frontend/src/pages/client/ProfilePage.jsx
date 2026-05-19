import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Save,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  authAPI,
  categoriesAPI,
  extractApiEntity,
  extractApiItems,
  sellersAPI,
  uploadsAPI,
} from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n/index.jsx';

function parseApiError(error) {
  return error?.response?.data?.message ?? error?.message ?? 'Something went wrong';
}

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 3500);
    return () => clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold whitespace-nowrap ${
      type === 'success' ? 'bg-sage-500 text-white' : 'bg-danger text-white'
    }`}
    >
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-warm-700">{label}</label>
        {hint && <span className="text-[10px] text-warm-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="text-[10px] text-danger flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

function AvatarUploader({ currentUrl, fullName, onUpload }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const initials = (fullName ?? 'U').split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await uploadsAPI.uploadImage(formData);
      const url = response.data?.data?.url ?? response.data?.url ?? '';

      if (url) {
        onUpload(url);
      }
    } catch {
      // Keep uploader non-blocking; the page toast handles the rest of the flow.
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl overflow-hidden bg-cream-200 border-2 border-beige-200">
          {currentUrl ? (
            <img src={currentUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">{initials}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-sage-500 hover:bg-sage-600 rounded-full flex items-center justify-center shadow-sm transition-colors"
        >
          {loading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
      <p className="text-xs text-warm-400">{t('profile.photoHint')}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser, logout, isSeller, isAdmin, changePassword } = useAuth();

  const [form, setForm] = useState({ full_name: '', phone: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [pwShow, setPwShow] = useState({ old: false, new: false, confirm: false });

  const [sellerId, setSellerId] = useState(null);
  const [sellerForm, setSellerForm] = useState({
    shop_name: '',
    description: '',
    location: '',
    story: '',
    category_id: '',
    avatar_url: '',
  });
  const [savingSeller, setSavingSeller] = useState(false);
  const [categories, setCategories] = useState([]);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  function setProfileField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: '' }));
    }
  }

  function setPasswordField(key, value) {
    setPwForm((current) => ({ ...current, [key]: value }));
    if (passwordErrors[key]) {
      setPasswordErrors((current) => ({ ...current, [key]: '' }));
    }
  }

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name ?? '',
        phone: user.phone ?? '',
        avatar_url: user.avatar_url ?? '',
      });
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!isSeller) {
      return;
    }

    setSellerLoading(true);

    Promise.all([sellersAPI.getMe(), categoriesAPI.getAll()])
      .then(([sellerResponse, categoriesResponse]) => {
        const seller = extractApiEntity(sellerResponse, 'seller');
        const categoryItems = extractApiItems(categoriesResponse, { itemKeys: ['categories'] });

        if (seller) {
          setSellerId(seller.id);
          setSellerForm({
            shop_name: seller.shop_name ?? '',
            description: seller.description ?? '',
            location: seller.location ?? '',
            story: seller.story ?? '',
            category_id: seller.category_id ?? '',
            avatar_url: seller.avatar_url ?? '',
          });
        }

        setCategories(categoryItems);
      })
      .catch(() => {})
      .finally(() => setSellerLoading(false));
  }, [isSeller]);

  function validateProfile() {
    const nextErrors = {};

    if (!form.full_name.trim()) {
      nextErrors.full_name = t('validation.required');
    }

    return nextErrors;
  }

  async function handleSaveProfile() {
    const nextErrors = validateProfile();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        ...(form.phone && { phone: form.phone }),
        ...(form.avatar_url && { avatar_url: form.avatar_url }),
      };

      await authAPI.updateMe(payload);
      updateUser({ full_name: payload.full_name, phone: payload.phone, avatar_url: form.avatar_url });
      showToast(t('profile.profileSaved'));
    } catch (error) {
      showToast(parseApiError(error), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveShop() {
    if (!sellerId) {
      showToast(t('profile.shopNotReady'), 'error');
      return;
    }

    setSavingSeller(true);

    try {
      await sellersAPI.update(sellerId, sellerForm);
      showToast(t('profile.shopSaved'));
    } catch (error) {
      showToast(parseApiError(error), 'error');
    } finally {
      setSavingSeller(false);
    }
  }

  function validatePassword() {
    const nextErrors = {};

    if (!pwForm.old_password) {
      nextErrors.old_password = t('validation.required');
    }

    if (!pwForm.new_password) {
      nextErrors.new_password = t('validation.required');
    } else if (pwForm.new_password.length < 8) {
      nextErrors.new_password = t('validation.passwordMin');
    } else if (pwForm.old_password && pwForm.new_password === pwForm.old_password) {
      nextErrors.new_password = t('validation.passwordDifferent');
    }

    if (!pwForm.confirm_password) {
      nextErrors.confirm_password = t('validation.required');
    } else if (pwForm.new_password !== pwForm.confirm_password) {
      nextErrors.confirm_password = t('validation.passwordsDoNotMatch');
    }

    return nextErrors;
  }

  async function handleChangePassword() {
    const nextErrors = validatePassword();
    if (Object.keys(nextErrors).length) {
      setPasswordErrors(nextErrors);
      return;
    }

    setSavingPassword(true);

    try {
      await changePassword({
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
        confirm_password: pwForm.confirm_password,
      });

      setPwForm({ old_password: '', new_password: '', confirm_password: '' });
      showToast(t('auth.changePassword.success'));
    } catch (error) {
      showToast(parseApiError(error), 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate('/', { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <Loader2 size={28} className="text-sage-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-warm-900">{t('profile.title')}</h1>
            <p className="text-xs text-warm-400">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold rounded-2xl transition-colors disabled:opacity-60 shadow-sm"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> {t('common.saving')}</> : <><Save size={14} /> {t('common.save')}</>}
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
        <div className="bg-white rounded-3xl border border-beige-200 px-5 pb-5">
          <AvatarUploader
            currentUrl={form.avatar_url}
            fullName={form.full_name}
            onUpload={(url) => {
              setProfileField('avatar_url', url);
              updateUser({ avatar_url: url });
            }}
          />

          <div className="h-px bg-beige-100 mb-5" />

          <div className="space-y-4">
            <Field label={t('profile.fullName')} error={errors.full_name}>
              <input
                value={form.full_name}
                onChange={(event) => setProfileField('full_name', event.target.value)}
                className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 transition-colors ${
                  errors.full_name ? 'border-danger' : 'border-beige-200'
                }`}
              />
            </Field>

            <Field label={t('profile.phone')} hint={t('common.optional')}>
              <input
                value={form.phone}
                onChange={(event) => setProfileField('phone', event.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400 transition-colors"
              />
            </Field>

            <div className="flex items-center justify-between py-2.5 border-t border-beige-100">
              <span className="text-xs text-warm-500">{t('profile.email')}</span>
              <span className="text-sm font-semibold text-warm-900 truncate max-w-[200px]">{user?.email}</span>
            </div>
          </div>
        </div>

        {isSeller && (
          <div className="bg-white rounded-3xl border border-beige-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-sage-600" />
                <p className="text-sm font-bold text-warm-900">{t('profile.shopInformation')}</p>
              </div>
              <button
                type="button"
                onClick={handleSaveShop}
                disabled={savingSeller || !sellerId}
                className="flex items-center gap-1.5 px-4 py-2 bg-sage-500 hover:bg-sage-600 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-60"
              >
                {savingSeller ? <><Loader2 size={12} className="animate-spin" /> {t('common.saving')}</> : <><Save size={12} /> {t('profile.saveShop')}</>}
              </button>
            </div>

            {sellerLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="text-sage-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <Field label={t('profile.shopName')}>
                  <input
                    value={sellerForm.shop_name}
                    onChange={(event) => setSellerForm((current) => ({ ...current, shop_name: event.target.value }))}
                    className="w-full px-4 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400"
                  />
                </Field>

                <Field label={t('profile.shortBio')} hint={t('profile.shortBioHint')}>
                  <textarea
                    value={sellerForm.description}
                    onChange={(event) => setSellerForm((current) => ({ ...current, description: event.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400 resize-none"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('profile.category')}>
                    <select
                      value={sellerForm.category_id}
                      onChange={(event) => setSellerForm((current) => ({ ...current, category_id: event.target.value }))}
                      className="w-full px-3 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400"
                    >
                      <option value="">{t('common.optional')}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name_ar ?? category.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t('profile.city')}>
                    <input
                      value={sellerForm.location}
                      onChange={(event) => setSellerForm((current) => ({ ...current, location: event.target.value }))}
                      className="w-full px-3 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400"
                    />
                  </Field>
                </div>

                <Field label={t('profile.story')}>
                  <textarea
                    value={sellerForm.story}
                    onChange={(event) => setSellerForm((current) => ({ ...current, story: event.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400 resize-none"
                  />
                </Field>

                <Link
                  to="/seller/profile"
                  className="flex items-center justify-between px-4 py-3 bg-cream-100 rounded-2xl border border-beige-200 hover:border-sage-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-sage-600" />
                    <span className="text-sm font-medium text-warm-800">{t('profile.fullShopSettings')}</span>
                  </div>
                  <ChevronRight size={14} className="text-warm-400" />
                </Link>
              </div>
            )}
          </div>
        )}

        {!isAdmin && (
          <div className="bg-white rounded-3xl border border-beige-200 overflow-hidden">
            <Link to="/orders" className="flex items-center gap-3 px-4 py-4 border-b border-beige-100 hover:bg-cream-100 transition-colors">
              <div className="w-9 h-9 bg-cream-200 rounded-xl flex items-center justify-center">
                <ShoppingBag size={16} className="text-sage-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-warm-900">{t('profile.myOrders')}</p>
                <p className="text-[10px] text-warm-400">{t('profile.myOrdersDescription')}</p>
              </div>
              <ChevronRight size={15} className="text-warm-400" />
            </Link>

            <Link to="/wishlist" className="flex items-center gap-3 px-4 py-4 hover:bg-cream-100 transition-colors">
              <div className="w-9 h-9 bg-cream-200 rounded-xl flex items-center justify-center">
                <ShoppingBag size={16} className="text-sage-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-warm-900">{t('profile.savedProducts')}</p>
                <p className="text-[10px] text-warm-400">{t('profile.savedProductsDescription')}</p>
              </div>
              <ChevronRight size={15} className="text-warm-400" />
            </Link>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-beige-200 p-5 space-y-4">
          <p className="text-xs font-bold text-warm-400 uppercase tracking-widest">{t('auth.changePassword.title')}</p>

          <Field label={t('auth.changePassword.oldPassword')} error={passwordErrors.old_password}>
            <div className="relative">
              <input
                type={pwShow.old ? 'text' : 'password'}
                value={pwForm.old_password}
                onChange={(event) => setPasswordField('old_password', event.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 pr-10 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 ${
                  passwordErrors.old_password ? 'border-danger' : 'border-beige-200'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setPwShow((s) => ({ ...s, old: !s.old }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
              >
                {pwShow.old ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label={t('auth.changePassword.newPassword')} error={passwordErrors.new_password}>
            <div className="relative">
              <input
                type={pwShow.new ? 'text' : 'password'}
                value={pwForm.new_password}
                onChange={(event) => setPasswordField('new_password', event.target.value)}
                placeholder={t('validation.passwordMin')}
                className={`w-full px-4 py-2.5 pr-10 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 ${
                  passwordErrors.new_password ? 'border-danger' : 'border-beige-200'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setPwShow((s) => ({ ...s, new: !s.new }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
              >
                {pwShow.new ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label={t('auth.changePassword.confirmPassword')} error={passwordErrors.confirm_password}>
            <div className="relative">
              <input
                type={pwShow.confirm ? 'text' : 'password'}
                value={pwForm.confirm_password}
                onChange={(event) => setPasswordField('confirm_password', event.target.value)}
                placeholder={t('auth.register.confirmPlaceholder')}
                className={`w-full px-4 py-2.5 pr-10 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 ${
                  passwordErrors.confirm_password ? 'border-danger' : 'border-beige-200'
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setPwShow((s) => ({ ...s, confirm: !s.confirm }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
              >
                {pwShow.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <button
            type="button"
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="w-full py-3 border border-beige-200 bg-cream-100 hover:bg-beige-200 text-warm-800 text-sm font-semibold rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {savingPassword ? <><Loader2 size={14} className="animate-spin" /> {t('auth.changePassword.submitting')}</> : t('auth.changePassword.submit')}
          </button>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-red-100 bg-red-50 hover:bg-red-100 text-danger text-sm font-semibold rounded-2xl transition-colors disabled:opacity-60"
        >
          {loggingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
          {loggingOut ? t('profile.loggingOut') : t('profile.logout')}
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
