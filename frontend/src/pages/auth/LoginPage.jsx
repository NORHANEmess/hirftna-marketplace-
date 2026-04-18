import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// LOGIN PAGE
// Route: /login  (GuestOnly — redirects if already logged in)
// ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  // Where to go after login (passed by RequireAuth guard)
  const from = location.state?.from?.pathname || '/';

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return;
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      // Sellers go to dashboard, everyone else back to where they came from
      navigate(user.role === 'seller' ? '/seller/dashboard' : from, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-cream-100">
      <div className="w-full max-w-sm">

        {/* ── Logo ──────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div
            className="text-5xl font-bold text-sage-600 leading-none mb-1"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            حرفتنا
          </div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-warm-400 uppercase mb-3">
            MARKETPLACE
          </p>
          <p className="text-sm text-warm-500">Welcome back — sign in to your account</p>
        </div>

        {/* ── Card ──────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-beige-200 shadow-soft p-7">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="label">
                Email address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <Mail size={16} />
                </span>
                <input
                  id="login-email"
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="label mb-0">
                  Password
                </label>
                {/* Placeholder for future forgot-password */}
                {/* <Link to="/forgot-password" className="text-xs text-sage-600 hover:underline">Forgot?</Link> */}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder="••••••••"
                  className="input pl-10 pr-11"
                  autoComplete="current-password"
                  required
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
              disabled={loading}
              className="btn-primary w-full py-3 text-sm mt-1"
            >
              {loading ? (
                <><Loader size={15} className="animate-spin" /> Signing in...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 border-t border-beige-200" />
            <span className="text-xs text-warm-400 font-medium">or</span>
            <div className="flex-1 border-t border-beige-200" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-warm-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-sage-600 font-semibold hover:text-sage-700 hover:underline transition-colors"
            >
              Join Hirftna
            </Link>
          </p>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-warm-400 mt-5 leading-relaxed">
          By signing in you agree to our Terms of Service and Privacy Policy.
        </p>

      </div>
    </div>
  );
}