import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader, Lock, Mail, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n/index.jsx';
import { getApiErrorFields, getApiErrorMessage } from '../../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { login, verifyOtp, pendingOtp, clearPendingOtp } = useAuth();

  const from = location.state?.from?.pathname || '/';

  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const loginEmail = pendingOtp?.user?.email || credentials.email.trim();
  const inOtpStep = Boolean(pendingOtp?.otp_token);

  const handleAuthenticatedRedirect = (user) => {
    navigate(user?.role === 'seller' ? '/seller/dashboard' : from, { replace: true });
  };

  const handleCredentialSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const result = await login(credentials.email.trim(), credentials.password);

      if (result.requiresOtp) {
        return;
      }

      handleAuthenticatedRedirect(result.user);
    } catch (requestError) {
      setFieldErrors(getApiErrorFields(requestError));
      setError(getApiErrorMessage(requestError, t('auth.login.invalidCredentials')));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const result = await verifyOtp({
        otp_token: pendingOtp?.otp_token,
        otp,
      });

      handleAuthenticatedRedirect(result.user);
    } catch (requestError) {
      setFieldErrors(getApiErrorFields(requestError));
      setError(getApiErrorMessage(requestError, t('common.unknownError')));
    } finally {
      setLoading(false);
    }
  };

  const otpSubtitle = useMemo(() => (
    t('auth.login.otpSubtitle', { email: loginEmail })
  ), [loginEmail, t]);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-cream-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="text-5xl font-bold text-sage-600 leading-none mb-1"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {t('common.appNameArabic')}
          </div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-warm-400 uppercase mb-3">
            {t('common.appNameLatin')}
          </p>
          <p className="text-sm text-warm-500">
            {inOtpStep ? t('auth.login.otpTitle') : t('auth.login.subtitle')}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-beige-200 shadow-soft p-7">
          {!inOtpStep ? (
            <form onSubmit={handleCredentialSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="login-email" className="label">
                  {t('auth.login.email')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                    <Mail size={16} />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    value={credentials.email}
                    onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
                    placeholder={t('auth.login.emailPlaceholder')}
                    className="input pl-10"
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>
                {fieldErrors.email && <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="login-password" className="label">
                  {t('auth.login.password')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                    <Lock size={16} />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                    placeholder={t('auth.login.passwordPlaceholder')}
                    className="input pl-10 pr-11"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
                    aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>}
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                  <span className="text-danger mt-0.5 flex-shrink-0">!</span>
                  <p className="text-sm text-danger leading-snug">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm mt-1"
              >
                {loading ? (
                  <><Loader size={15} className="animate-spin" /> {t('auth.login.submitting')}</>
                ) : (
                  t('auth.login.submit')
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-5" noValidate>
              <div className="rounded-2xl bg-cream-100 border border-beige-200 px-4 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-sage-100 flex items-center justify-center">
                    <Shield size={18} className="text-sage-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-warm-900">{t('auth.login.otpTitle')}</p>
                    <p className="text-xs text-warm-500">{otpSubtitle}</p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="login-otp" className="label">
                  {t('auth.login.otpLabel')}
                </label>
                <input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('auth.login.otpPlaceholder')}
                  className="input text-center tracking-[0.45em]"
                  disabled={loading}
                />
                {fieldErrors.otp && <p className="mt-1 text-xs text-danger">{fieldErrors.otp}</p>}
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                  <span className="text-danger mt-0.5 flex-shrink-0">!</span>
                  <p className="text-sm text-danger leading-snug">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-primary w-full py-3 text-sm mt-1"
              >
                {loading ? (
                  <><Loader size={15} className="animate-spin" /> {t('auth.login.otpSubmitting')}</>
                ) : (
                  t('auth.login.otpSubmit')
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearPendingOtp();
                  setOtp('');
                  setError('');
                }}
                className="w-full py-3 text-sm font-semibold rounded-2xl border border-beige-200 bg-cream-100 text-warm-700 hover:bg-beige-200 transition-colors"
              >
                {t('auth.login.backToLogin')}
              </button>
            </form>
          )}

          {!inOtpStep && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 border-t border-beige-200" />
                <span className="text-xs text-warm-400 font-medium">{t('common.or')}</span>
                <div className="flex-1 border-t border-beige-200" />
              </div>

              <p className="text-center text-sm text-warm-500">
                {t('auth.login.registerPrompt')}{' '}
                <Link to="/register" className="text-sage-600 font-semibold hover:text-sage-700 hover:underline transition-colors">
                  {t('auth.login.registerLink')}
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-warm-400 mt-5 leading-relaxed">
          {t('auth.login.agreement')}
        </p>
      </div>
    </div>
  );
}