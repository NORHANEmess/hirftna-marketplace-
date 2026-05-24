import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader, User, Mail, Lock, ShieldCheck } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n/index.jsx';
import { getApiErrorFields } from '../../services/api';
import ErrorBanner from '../../components/ui/ErrorBanner';
import OtpStep from '../../components/auth/OtpStep';
import LogoMark from '../../components/ui/LogoMark';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { register, pendingOtp, clearPendingOtp, verifyOtp } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm: '',
    role: 'client',
  });

  const [showPw, setShowPw] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const inOtpStep = Boolean(pendingOtp?.otp_token);
  const registeredEmail = pendingOtp?.user?.email || form.email.trim();

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setRole = (role) => setForm((f) => ({ ...f, role }));

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
    setError(null);
    setFieldErrors({});

    if (!form.full_name.trim()) return setError(t('auth.register.errorName'));
    if (!form.email.trim()) return setError(t('auth.register.errorEmail'));
    if (form.password.length < 8) return setError(t('auth.register.errorPasswordLength'));
    if (form.password !== form.confirm) return setError(t('auth.register.errorPasswordMatch'));

    setLoading(true);

    try {
      const result = await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        confirm_password: form.confirm,
        role: form.role,
      });

      if (result.requiresOtp) {
        return;
      }

      navigate(result.user?.role === 'seller' ? '/seller/dashboard' : '/', { replace: true });
    } catch (err) {
      setFieldErrors(getApiErrorFields(err));
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (code) => {
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const result = await verifyOtp({
        otp_token: pendingOtp?.otp_token,
        otp: code,
      });
      if (!result?.user) {
        navigate('/login', { state: { verified: true }, replace: true });
        return;
      }
      navigate(result.user.role === 'seller' ? '/seller/dashboard' : '/', { replace: true });
    } catch (err) {
      setFieldErrors(getApiErrorFields(err));
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    clearPendingOtp();
    setError(null);
    setFieldErrors({});
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 pt-10 pb-28 md:py-10 bg-cream-100">
      <div className="w-full max-w-sm">

        <div className="text-center mb-7">
          <div className="flex justify-center mb-4"><LogoMark size="lg" /></div>
          <p className="text-sm text-warm-500">
            {inOtpStep ? t('auth.login.otpTitle') : t('auth.register.subtitle')}
          </p>
        </div>

        <div className="relative bg-white rounded-3xl border border-beige-200 shadow-soft p-7">

          {/* Loading overlay: visible while awaiting OTP response, before the OTP form appears */}
          {loading && !inOtpStep && (
            <div className="absolute inset-0 bg-white/75 rounded-3xl flex items-center justify-center z-10">
              <Loader size={28} className="animate-spin text-sage-500" />
            </div>
          )}

          {!inOtpStep ? (
            <>
              <div className="mb-6">
                <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2.5">
                  {t('auth.register.rolePrompt')}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { value: 'client', title: t('auth.register.roleClient'), desc: t('auth.register.roleClientDesc') },
                    { value: 'seller', title: t('auth.register.roleSeller'), desc: t('auth.register.roleSellerDesc') },
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
                <div>
                  <label className="label">{t('auth.register.fullName')}</label>
                  <div className="relative">
                    <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={update('full_name')}
                      placeholder={t('auth.register.namePlaceholder')}
                      className="input ps-10"
                      disabled={loading}
                    />
                  </div>
                  {fieldErrors.full_name && <p className="text-xs text-danger mt-1">{fieldErrors.full_name}</p>}
                </div>

                <div>
                  <label className="label">{t('auth.register.email')}</label>
                  <div className="relative">
                    <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={update('email')}
                      placeholder={t('auth.register.emailPlaceholder')}
                      className="input ps-10"
                      disabled={loading}
                    />
                  </div>
                  {fieldErrors.email && <p className="text-xs text-danger mt-1">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="label">{t('auth.register.password')}</label>
                  <div className="relative">
                    <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={update('password')}
                      placeholder={t('auth.register.passwordPlaceholder')}
                      className="input ps-10 pe-11"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute end-3.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwStrength && (
                    <div className="mt-1.5">
                      <div className="h-1 w-full bg-beige-200 rounded-full overflow-hidden">
                        <div className={`h-full ${pwStrength.color} transition-all`} style={{ width: pwStrength.width }} />
                      </div>
                      <p className="text-[10px] text-warm-400 mt-0.5">{pwStrength.label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">{t('auth.register.confirmPassword')}</label>
                  <div className="relative">
                    <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                      <ShieldCheck size={16} />
                    </span>
                    <input
                      type={showConf ? 'text' : 'password'}
                      value={form.confirm}
                      onChange={update('confirm')}
                      placeholder={t('auth.register.confirmPlaceholder')}
                      className="input ps-10 pe-11"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConf((v) => !v)}
                      className="absolute end-3.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
                    >
                      {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <ErrorBanner error={error} />

                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm mt-1">
                  {loading
                    ? <><Loader size={15} className="animate-spin" /> {t('auth.register.submitting')}</>
                    : t('auth.register.submit')}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 border-t border-beige-200" />
                <span className="text-xs text-warm-400 font-medium">{t('common.or')}</span>
                <div className="flex-1 border-t border-beige-200" />
              </div>

              <p className="text-center text-sm text-warm-500">
                {t('auth.register.loginPrompt')}{' '}
                <Link to="/login" className="text-sage-600 font-semibold hover:text-sage-700 hover:underline transition-colors">
                  {t('auth.register.loginLink')}
                </Link>
              </p>
            </>
          ) : (
            <OtpStep
              email={registeredEmail}
              onVerify={handleOtpVerify}
              onBack={handleBack}
              loading={loading}
              error={error}
            />
          )}
        </div>

        <p className="text-center text-xs text-warm-400 mt-5 leading-relaxed">
          {t('auth.login.agreement')}
        </p>
      </div>
    </div>
  );
}
