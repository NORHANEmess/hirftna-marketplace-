import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader, User, Mail, Lock, ShieldCheck } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { getApiErrorFields, getApiErrorMessage } from '../../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'client',
  });

  const [showPw, setShowPw] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const update = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const setRole = (role) =>
    setForm((f) => ({ ...f, role }));

  // نفس logic تاعك بدون تغيير
  const pwStrength = (() => {
    const p = form.password;
    if (p.length === 0) return null;
    if (p.length < 6) return { label: 'Too short', color: 'bg-danger', width: '25%' };
    if (p.length < 8) return { label: 'Weak', color: 'bg-orange-400', width: '50%' };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p))
      return { label: 'Fair', color: 'bg-warning', width: '75%' };
    return { label: 'Strong', color: 'bg-sage-500', width: '100%' };
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setFieldErrors({});

    // validation محلي (خليه)
    if (!form.full_name.trim()) return setError('Please enter your full name.');
    if (!form.email.trim()) return setError('Please enter your email address.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');

    setLoading(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm, // 👈 مهم
        role: form.role,
      };

      const result = await register(payload);

      navigate(
        result.user?.role === 'seller'
          ? '/seller/dashboard'
          : '/',
        { replace: true }
      );

    } catch (err) {
      setFieldErrors(getApiErrorFields(err));
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10 bg-cream-100">
      <div className="w-full max-w-sm">

        <div className="text-center mb-7">
          <div className="text-5xl font-bold text-sage-600 leading-none mb-1" style={{ fontFamily: "'Amiri', serif" }}>
            حِرْفتنَا
          </div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-warm-400 uppercase mb-3">
            MARKETPLACE
          </p>
          <p className="text-sm text-warm-500">Create your free account today</p>
        </div>

        <div className="bg-white rounded-3xl border border-beige-200 shadow-soft p-7">

          <div className="mb-6">
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2.5">
              I want to…
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  value: 'client',
                  title: 'Buy',
                  desc: 'Discover & order custom handmade products',
                },
                {
                  value: 'seller',
                  title: 'Sell',
                  desc: 'List my crafts and receive custom orders',
                },
              ].map((opt) => {
                const active = form.role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-2xl border-2 text-center transition-all duration-200 cursor-pointer
                      ${active
                        ? 'border-sage-500 bg-sage-50 shadow-soft-sm'
                        : 'border-beige-200 bg-cream-100 hover:border-sage-300 hover:bg-cream-200'}
                    `}
                  >
                    <span className={`text-sm font-bold ${active ? 'text-sage-700' : 'text-warm-700'}`}>
                      {opt.title}
                    </span>
                    <span className="text-[10px] leading-tight text-warm-400">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Full name */}
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={update('full_name')}
                  className="input pl-10"
                  disabled={loading}
                />
              </div>
              {fieldErrors.full_name && <p className="text-xs text-danger">{fieldErrors.full_name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  className="input pl-10"
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && <p className="text-xs text-danger">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <Lock size={16} />
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={update('password')}
                  className="input pl-10 pr-11"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <ShieldCheck size={16} />
                </span>
                <input
                  type={showConf ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={update('confirm')}
                  className="input pl-10 pr-11"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Error */}
            {error && <p className="text-sm text-danger">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader className="animate-spin" size={16} /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-4">
            <Link to="/login">Login</Link>
          </p>

        </div>
      </div>
    </div>
  );
}