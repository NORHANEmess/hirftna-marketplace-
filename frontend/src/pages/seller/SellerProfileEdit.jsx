import { useState, useEffect, useRef } from 'react';
import {
  Camera, Save, Loader2, CheckCircle2,
  AlertCircle, Store, BookOpen, User,
} from 'lucide-react';
import { sellersAPI, uploadsAPI, categoriesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseApiError(err) {
  return err?.response?.data?.message ?? err?.message ?? 'Something went wrong';
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50
      flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold
      whitespace-nowrap transition-all
      ${type === 'success' ? 'bg-sage-500 text-white' : 'bg-danger text-white'}`}
    >
      {type === 'success'
        ? <CheckCircle2 size={15} />
        : <AlertCircle size={15} />
      }
      {message}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
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

// ─── Avatar Uploader ──────────────────────────────────────────────────────────
function AvatarUploader({ currentUrl, shopName, onUpload }) {
  const inputRef   = useRef(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await uploadsAPI.uploadImage(fd);
      const url = res.data?.data?.url ?? res.data?.url ?? '';
      if (url) onUpload(url);
    } catch { /* silent — toast shown by parent */ }
    finally { setLoading(false); }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Avatar preview */}
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-cream-200 border-2 border-beige-200">
          {currentUrl ? (
            <img src={currentUrl} alt="Shop avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {shopName?.charAt(0)?.toUpperCase() ?? 'S'}
              </span>
            </div>
          )}
        </div>

        {/* Camera overlay button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-sage-500 hover:bg-sage-600
            rounded-full flex items-center justify-center shadow-sm transition-colors"
        >
          {loading
            ? <Loader2 size={13} className="text-white animate-spin" />
            : <Camera size={13} className="text-white" />
          }
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div>
        <p className="text-sm font-semibold text-warm-800">Shop Avatar</p>
        <p className="text-[10px] text-warm-400 mt-0.5">
          Tap the camera icon to change your photo
        </p>
        <p className="text-[10px] text-warm-400">JPG, PNG or WebP · Max 5MB</p>
      </div>
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
        transition-all duration-150 flex-1 justify-center
        ${active
          ? 'bg-sage-500 text-white shadow-sm'
          : 'text-warm-500 hover:text-warm-800 hover:bg-cream-200'
        }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SellerProfileEdit() {
  const { user, updateUser } = useAuth();

  const [tab,        setTab]        = useState('shop');   // 'shop' | 'story' | 'account'
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);
  const [errors,     setErrors]     = useState({});

  // ── Form state ──
  const [form, setForm] = useState({
    shop_name:   '',
    bio:         '',
    story:       '',
    category_id: '',
    avatar_url:  '',
    city:        '',
  });

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  // ── Load seller profile ──
  useEffect(() => {
    Promise.all([
      sellersAPI.getMe(),
      categoriesAPI.getAll(),
    ])
      .then(([sellerRes, catsRes]) => {
        const seller = sellerRes.data?.data;
        const cats   = catsRes.data?.data;

        if (seller) {
          setForm({
            shop_name:   seller.shop_name   ?? '',
            bio:         seller.bio         ?? '',
            story:       seller.story       ?? '',
            category_id: seller.category_id ?? '',
            avatar_url:  seller.avatar_url  ?? '',
            city:        seller.city        ?? '',
          });
        }
        setCategories(Array.isArray(cats) ? cats : (cats?.categories ?? []));
      })
      .catch(() => showToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // ── Validate per tab ──
  function validate() {
    const e = {};
    if (tab === 'shop') {
      if (!form.shop_name.trim()) e.shop_name = 'Shop name is required';
      else if (form.shop_name.length < 3) e.shop_name = 'At least 3 characters';
    }
    return e;
  }

  // ── Save handler ──
  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const res = await sellersAPI.updateMe(form);
      const updated = res.data?.data;
      if (updated) updateUser({ seller: updated });
      showToast('Profile saved successfully');
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setSaving(false);
    }
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

      {/* ── Header ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-warm-900">Shop Settings</h1>
            <p className="text-xs text-warm-400">Manage your artisan profile</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-sage-500 hover:bg-sage-600
              text-white text-sm font-semibold rounded-2xl transition-colors disabled:opacity-60 shadow-sm"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
              : <><Save size={14} /> Save</>
            }
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">

        {/* ── Tab switcher ── */}
        <div className="flex gap-1.5 bg-cream-200 p-1 rounded-2xl border border-beige-200">
          <TabBtn active={tab === 'shop'}    onClick={() => setTab('shop')}    icon={Store}    label="Shop"    />
          <TabBtn active={tab === 'story'}   onClick={() => setTab('story')}   icon={BookOpen} label="Story"   />
          <TabBtn active={tab === 'account'} onClick={() => setTab('account')} icon={User}     label="Account" />
        </div>

        {/* ════════════════════════ SHOP TAB ════════════════════════ */}
        {tab === 'shop' && (
          <div className="bg-white rounded-3xl border border-beige-200 p-5 space-y-5">

            {/* Avatar */}
            <AvatarUploader
              currentUrl={form.avatar_url}
              shopName={form.shop_name}
              onUpload={url => set('avatar_url', url)}
            />

            <div className="h-px bg-beige-100" />

            {/* Shop name */}
            <Field label="Shop Name" error={errors.shop_name}>
              <input
                value={form.shop_name}
                onChange={e => set('shop_name', e.target.value)}
                placeholder="e.g. Fatima's Ceramics"
                className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl
                  outline-none focus:border-sage-400 transition-colors
                  ${errors.shop_name ? 'border-danger' : 'border-beige-200'}`}
              />
            </Field>

            {/* Short bio */}
            <Field label="Short Bio" hint="Shown under your shop name">
              <textarea
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="One-line description of your craft..."
                rows={2}
                className="w-full px-4 py-2.5 text-sm bg-cream-100 border border-beige-200
                  rounded-2xl outline-none focus:border-sage-400 transition-colors resize-none"
              />
            </Field>

            {/* Category + City */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Main Category">
                <select
                  value={form.category_id}
                  onChange={e => set('category_id', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-cream-100 border border-beige-200
                    rounded-2xl outline-none focus:border-sage-400 transition-colors"
                >
                  <option value="">Select...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name_ar ?? c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="City / Wilaya">
                <input
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="e.g. Tizi Ouzou"
                  className="w-full px-3 py-2.5 text-sm bg-cream-100 border border-beige-200
                    rounded-2xl outline-none focus:border-sage-400 transition-colors"
                />
              </Field>
            </div>
          </div>
        )}

        {/* ════════════════════════ STORY TAB ════════════════════════ */}
        {tab === 'story' && (
          <div className="bg-white rounded-3xl border border-beige-200 p-5 space-y-4">
            {/* Explanation */}
            <div className="bg-sage-50 border border-sage-100 rounded-2xl p-4">
              <p className="text-xs font-semibold text-sage-700 mb-1">✦ Your Artisan Story</p>
              <p className="text-[11px] text-sage-600 leading-relaxed">
                This appears on your public profile page under "Story of the Seller".
                Tell buyers who you are, how you started, and what makes your craft unique.
                Write freely — this is your voice.
              </p>
            </div>

            <Field
              label="Your Story"
              hint={`${form.story.length} characters`}
            >
              <textarea
                value={form.story}
                onChange={e => set('story', e.target.value)}
                placeholder={`I discovered my love for pottery when I was 12 years old, watching my grandmother shape clay in our kitchen in Tizi Ouzou...\n\nEvery piece I make carries that memory.`}
                rows={12}
                className="w-full px-4 py-3 text-sm bg-cream-100 border border-beige-200
                  rounded-2xl outline-none focus:border-sage-400 transition-colors resize-none
                  leading-relaxed"
                style={{ fontFamily: "'Amiri', serif" }}
              />
            </Field>

            {/* Preview chip */}
            {form.story.trim() && (
              <div className="bg-cream-100 border border-beige-200 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-2">
                  Preview
                </p>
                <p className="text-sm text-warm-700 leading-relaxed whitespace-pre-line"
                   style={{ fontFamily: "'Amiri', serif" }}>
                  {form.story}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════ ACCOUNT TAB ════════════════════════ */}
        {tab === 'account' && (
          <div className="space-y-4">
            {/* Read-only account info */}
            <div className="bg-white rounded-3xl border border-beige-200 p-5 space-y-4">
              <p className="text-xs font-bold text-warm-400 uppercase tracking-widest">
                Account Information
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2.5 border-b border-beige-100">
                  <span className="text-sm text-warm-500">Full Name</span>
                  <span className="text-sm font-semibold text-warm-900">
                    {user?.full_name ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-beige-100">
                  <span className="text-sm text-warm-500">Email</span>
                  <span className="text-sm font-semibold text-warm-900 truncate max-w-[180px]">
                    {user?.email ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-beige-100">
                  <span className="text-sm text-warm-500">Role</span>
                  <span className="text-xs font-bold bg-sage-100 text-sage-700 px-2.5 py-1 rounded-full">
                    Artisan / Seller
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-warm-500">Verification</span>
                  {user?.is_verified
                    ? <span className="flex items-center gap-1 text-xs font-bold text-sage-600">
                        <CheckCircle2 size={13} /> Verified
                      </span>
                    : <span className="text-xs text-warm-400">Pending verification</span>
                  }
                </div>
              </div>
            </div>

            {/* Change password link */}
            <div className="bg-white rounded-3xl border border-beige-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-warm-900">Password</p>
                  <p className="text-[10px] text-warm-400 mt-0.5">Last changed: unknown</p>
                </div>
                <button
                  onClick={() => {/* navigate to change-password or open modal */}}
                  className="text-xs font-semibold text-sage-600 border border-sage-200
                    bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-3xl border border-red-100 p-5">
              <p className="text-xs font-bold text-danger uppercase tracking-widest mb-3">
                Danger Zone
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-warm-900">Deactivate Shop</p>
                  <p className="text-[10px] text-warm-400 mt-0.5">
                    Hides your shop and products from buyers
                  </p>
                </div>
                <button
                  className="text-xs font-semibold text-danger border border-red-100
                    bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}