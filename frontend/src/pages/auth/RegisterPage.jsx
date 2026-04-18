import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader, User, Mail, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// REGISTER PAGE
// Route: /register  (GuestOnly — redirects if already logged in)
// ─────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate      = useNavigate();
  const { register }  = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    email:     '',
    password:  '',
    confirm:   '',
    role:      'client', // 'client' | 'seller'
  });
  const [showPw,    setShowPw]    = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setRole = (role) => setForm((f) => ({ ...f, role }));

  // Password strength — simple indicator
  const pwStrength = (() => {
    const p = form.password;
    if (p.length === 0)   return null;
    if (p.length < 6)     return { label: 'Too short', color: 'bg-danger',       width: '25%'  };
    if (p.length < 8)     return { label: 'Weak',      color: 'bg-orange-400',   width: '50%'  };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p))
                          return { label: 'Fair',      color: 'bg-warning',      width: '75%'  };
    return               { label: 'Strong',     color: 'bg-sage-500',       width: '100%' };
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (!form.full_name.trim()) { setError('Please enter your full name.');               return; }
    if (!form.email.trim())     { setError('Please enter your email address.');           return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.');            return; }

    setError('');
    setLoading(true);
    try {
      const user = await register({
        full_name: form.full_name.trim(),
        email:     form.email.trim(),
        password:  form.password,
        role:      form.role,
      });
      // Sellers → seller dashboard, clients → home
      navigate(user.role === 'seller' ? '/seller/dashboard' : '/', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10 bg-cream-100">
      <div className="w-full max-w-sm">

        {/* ── Logo ──────────────────────────────────────────── */}
        <div className="text-center mb-7">
          <div
            className="text-5xl font-bold text-sage-600 leading-none mb-1"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            حِرْفتنَا
          </div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-warm-400 uppercase mb-3">
            MARKETPLACE
          </p>
          <p className="text-sm text-warm-500">Create your free account today</p>
        </div>

        {/* ── Card ──────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-beige-200 shadow-soft p-7">

          {/* ── Role selector ──────────────────────────────── */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2.5">
              I want to…
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  value: 'client',
                  
                  title: 'Buy',
                  desc:  'Discover & order custom handmade products',
                },
                {
                  value: 'seller',
                  
                  title: 'Sell',
                  desc:  'List my crafts and receive custom orders',
                },
              ].map((opt) => {
                const active = form.role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`
                      flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-2xl border-2
                      text-center transition-all duration-200 cursor-pointer
                      ${active
                        ? 'border-sage-500 bg-sage-50 shadow-soft-sm'
                        : 'border-beige-200 bg-cream-100 hover:border-sage-300 hover:bg-cream-200'}
                    `}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className={`text-sm font-bold ${active ? 'text-sage-700' : 'text-warm-700'}`}>
                      {opt.title}
                    </span>
                    <span className="text-[10px] leading-tight text-warm-400">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Form ───────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Full name */}
            <div>
              <label htmlFor="reg-name" className="label">Full Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <User size={16} />
                </span>
                <input
                  id="reg-name"
                  type="text"
                  value={form.full_name}
                  onChange={update('full_name')}
                  placeholder="Your full name"
                  className="input pl-10"
                  autoComplete="name"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="label">Email address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <Mail size={16} />
                </span>
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="your@email.com"
                  className="input pl-10"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="label">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <Lock size={16} />
                </span>
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder="At least 8 characters"
                  className="input pl-10 pr-11"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength bar */}
              {pwStrength && (
                <div className="mt-2">
                  <div className="h-1 bg-beige-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${pwStrength.color}`}
                      style={{ width: pwStrength.width }}
                    />
                  </div>
                  <p className="text-[10px] text-warm-400 mt-1">{pwStrength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="reg-confirm" className="label">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <ShieldCheck size={16} />
                </span>
                <input
                  id="reg-confirm"
                  type={showConf ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={update('confirm')}
                  placeholder="Repeat your password"
                  className={`input pl-10 pr-11 ${
                    form.confirm && form.confirm !== form.password
                      ? 'border-danger/60 focus:ring-danger/40'
                      : ''
                  }`}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConf((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
                  aria-label={showConf ? 'Hide' : 'Show'}
                >
                  {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirm && form.confirm !== form.password && (
                <p className="text-[11px] text-danger mt-1">Passwords don't match</p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3"
              >
                <span className="text-danger mt-0.5 flex-shrink-0">✕</span>
                <p className="text-sm text-danger leading-snug">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || (form.confirm && form.confirm !== form.password)}
              className="btn-primary w-full py-3 text-sm mt-1"
            >
              {loading ? (
                <><Loader size={15} className="animate-spin" /> Creating account...</>
              ) : (
                form.role === 'seller' ? ' Create Seller Account' : ' Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-beige-200" />
            <span className="text-xs text-warm-400 font-medium">or</span>
            <div className="flex-1 border-t border-beige-200" />
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-warm-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-sage-600 font-semibold hover:text-sage-700 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-warm-400 mt-5 leading-relaxed px-4">
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </p>

      </div>
    </div>
  );
}