import { useState, useEffect, useRef } from 'react';
import {
  Camera, Save, Loader2, CheckCircle2,
  AlertCircle, ShoppingBag, ChevronRight,
  LogOut, User,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI, uploadsAPI } from '../../services/api';
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
      flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold whitespace-nowrap
      ${type === 'success' ? 'bg-sage-500 text-white' : 'bg-danger text-white'}`}
    >
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
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
function AvatarUploader({ currentUrl, fullName, onUpload }) {
  const inputRef  = useRef(null);
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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const initials = (fullName ?? 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
          className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-sage-500 hover:bg-sage-600
            rounded-full flex items-center justify-center shadow-sm transition-colors"
        >
          {loading
            ? <Loader2 size={14} className="text-white animate-spin" />
            : <Camera size={14} className="text-white" />
          }
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <p className="text-xs text-warm-400">Tap the camera to change your photo</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const navigate           = useNavigate();
  const { user, updateUser, logout } = useAuth();

  const [form,       setForm]       = useState({ full_name: '', phone: '', avatar_url: '' });
  const [pwForm,     setPwForm]     = useState({ current: '', next: '', confirm: '' });
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [savingPw,   setSavingPw]   = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errors,     setErrors]     = useState({});
  const [pwErrors,   setPwErrors]   = useState({});
  const [toast,      setToast]      = useState(null);

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  }
  function setPw(key, val) {
    setPwForm(prev => ({ ...prev, [key]: val }));
    if (pwErrors[key]) setPwErrors(prev => ({ ...prev, [key]: '' }));
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  // ── Load profile from AuthContext (already in localStorage) ──
  useEffect(() => {
    if (user) {
      setForm({
        full_name:  user.full_name  ?? '',
        phone:      user.phone      ?? '',
        avatar_url: user.avatar_url ?? '',
      });
    }
    setLoading(false);
  }, [user]);

  // ── Validate profile form ──
  function validateProfile() {
    const e = {};
    if (!form.full_name.trim())       e.full_name = 'Full name is required';
    if (form.phone && form.phone.length < 7) e.phone = 'Phone number too short';
    return e;
  }

  // ── Save profile ──
  async function handleSaveProfile() {
    const errs = validateProfile();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { full_name: form.full_name.trim(), phone: form.phone, avatar_url: form.avatar_url };
      await authAPI.updateMe(payload);
      updateUser(payload);
      showToast('Profile saved');
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Validate password form ──
  function validatePassword() {
    const e = {};
    if (!pwForm.current)           e.current = 'Current password is required';
    if (!pwForm.next)              e.next    = 'New password is required';
    else if (pwForm.next.length < 8) e.next  = 'At least 8 characters';
    if (pwForm.next !== pwForm.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  // ── Change password ──
  async function handleChangePassword() {
    const errs = validatePassword();
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setSavingPw(true);
    try {
      await authAPI.changePassword({
        current_password: pwForm.current,
        new_password:     pwForm.next,
      });
      setPwForm({ current: '', next: '', confirm: '' });
      showToast('Password changed');
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setSavingPw(false);
    }
  }

  // ── Logout ──
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

      {/* ── Header ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-warm-900">My Profile</h1>
            <p className="text-xs text-warm-400">{user?.email}</p>
          </div>
          <button
            onClick={handleSaveProfile}
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

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* ── Avatar + basic info ── */}
        <div className="bg-white rounded-3xl border border-beige-200 px-5 pb-5">
          <AvatarUploader
            currentUrl={form.avatar_url}
            fullName={form.full_name}
            onUpload={url => set('avatar_url', url)}
          />

          <div className="h-px bg-beige-100 mb-5" />

          <div className="space-y-4">
            <Field label="Full Name" error={errors.full_name}>
              <input
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                placeholder="Your full name"
                className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl
                  outline-none focus:border-sage-400 transition-colors
                  ${errors.full_name ? 'border-danger' : 'border-beige-200'}`}
              />
            </Field>

            <Field label="Phone Number" hint="Optional — for order contact" error={errors.phone}>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+213 555 123 456"
                className="w-full px-4 py-2.5 text-sm bg-cream-100 border border-beige-200
                  rounded-2xl outline-none focus:border-sage-400 transition-colors"
              />
            </Field>

            {/* Read-only email */}
            <div className="flex items-center justify-between py-2.5 border-t border-beige-100">
              <span className="text-xs text-warm-500">Email</span>
              <span className="text-sm font-semibold text-warm-900 truncate max-w-[200px]">
                {user?.email}
              </span>
            </div>
          </div>
        </div>

        {/* ── Quick links ── */}
        <div className="bg-white rounded-3xl border border-beige-200 overflow-hidden">
          <Link
            to="/orders"
            className="flex items-center gap-3 px-4 py-4 border-b border-beige-100
              hover:bg-cream-100 transition-colors"
          >
            <div className="w-9 h-9 bg-cream-200 rounded-xl flex items-center justify-center">
              <ShoppingBag size={16} className="text-sage-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-warm-900">My Orders</p>
              <p className="text-[10px] text-warm-400">View and track your custom orders</p>
            </div>
            <ChevronRight size={15} className="text-warm-400" />
          </Link>

          <Link
            to="/wishlist"
            className="flex items-center gap-3 px-4 py-4 hover:bg-cream-100 transition-colors"
          >
            <div className="w-9 h-9 bg-cream-200 rounded-xl flex items-center justify-center">
              <span className="text-base">♥</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-warm-900">Saved Products</p>
              <p className="text-[10px] text-warm-400">Your wishlist</p>
            </div>
            <ChevronRight size={15} className="text-warm-400" />
          </Link>
        </div>

        {/* ── Change password ── */}
        <div className="bg-white rounded-3xl border border-beige-200 p-5 space-y-4">
          <p className="text-xs font-bold text-warm-400 uppercase tracking-widest">
            Change Password
          </p>

          <Field label="Current Password" error={pwErrors.current}>
            <input
              type="password"
              value={pwForm.current}
              onChange={e => setPw('current', e.target.value)}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl
                outline-none focus:border-sage-400 transition-colors
                ${pwErrors.current ? 'border-danger' : 'border-beige-200'}`}
            />
          </Field>

          <Field label="New Password" error={pwErrors.next}>
            <input
              type="password"
              value={pwForm.next}
              onChange={e => setPw('next', e.target.value)}
              placeholder="At least 8 characters"
              className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl
                outline-none focus:border-sage-400 transition-colors
                ${pwErrors.next ? 'border-danger' : 'border-beige-200'}`}
            />
          </Field>

          <Field label="Confirm New Password" error={pwErrors.confirm}>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={e => setPw('confirm', e.target.value)}
              placeholder="Repeat new password"
              className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl
                outline-none focus:border-sage-400 transition-colors
                ${pwErrors.confirm ? 'border-danger' : 'border-beige-200'}`}
            />
          </Field>

          <button
            onClick={handleChangePassword}
            disabled={savingPw}
            className="w-full py-3 border border-beige-200 bg-cream-100 hover:bg-beige-200
              text-warm-800 text-sm font-semibold rounded-2xl transition-colors disabled:opacity-60
              flex items-center justify-center gap-2"
          >
            {savingPw
              ? <><Loader2 size={14} className="animate-spin" /> Updating...</>
              : 'Update Password'
            }
          </button>
        </div>

        {/* ── Logout ── */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 border border-red-100
            bg-red-50 hover:bg-red-100 text-danger text-sm font-semibold rounded-2xl
            transition-colors disabled:opacity-60"
        >
          {loggingOut
            ? <Loader2 size={15} className="animate-spin" />
            : <LogOut size={15} />
          }
          {loggingOut ? 'Signing out...' : 'Sign Out'}
        </button>

      </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}