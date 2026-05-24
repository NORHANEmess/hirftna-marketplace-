import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Loader, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n/index.jsx';
import { getApiErrorFields } from '../../services/api';
import ErrorBanner from '../../components/ui/ErrorBanner';
import OtpStep from '../../components/auth/OtpStep';
import LogoMark from '../../components/ui/LogoMark';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { login, pendingOtp, clearPendingOtp, verifyOtp } = useAuth();

  const from = location.state?.from?.pathname || '/';
  const verified = location.state?.verified;

  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [emailNotVerified, setEmailNotVerified] = useState(false);

  const inOtpStep = Boolean(pendingOtp?.otp_token);
  const pendingEmail = pendingOtp?.user?.email || credentials.email.trim();

  const handleCredentialSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setEmailNotVerified(false);
    setLoading(true);

    try {
      const result = await login(credentials.email.trim(), credentials.password);
      if (result.requiresOtp) {
        return;
      }
      const role = result.user?.role;
      navigate(
        role === 'admin' ? '/admin' : role === 'seller' ? '/seller/dashboard' : from,
        { replace: true }
      );
    } catch (requestError) {
      if (requestError?.response?.status === 403) {
        setEmailNotVerified(true);
      } else {
        setFieldErrors(getApiErrorFields(requestError));
        setError(requestError);
      }
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
      const role = result?.user?.role;
      navigate(
        role === 'admin' ? '/admin' : role === 'seller' ? '/seller/dashboard' : from,
        { replace: true }
      );
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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 pt-12 pb-28 md:py-12 bg-cream-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><LogoMark size="lg" /></div>
          <p className="text-sm text-warm-500">{t('auth.login.subtitle')}</p>
        </div>

        {verified && (
          <div className="mb-4 flex items-center gap-2.5 px-4 py-3 bg-sage-50 border border-sage-200 rounded-2xl">
            <CheckCircle2 size={16} className="text-sage-600 flex-shrink-0" />
            <p className="text-sm font-medium text-sage-700">{t('auth.login.verifiedSuccess')}</p>
          </div>
        )}

        <div className="relative bg-white rounded-3xl border border-beige-200 shadow-soft p-7">
          {loading && !inOtpStep && (
            <div className="absolute inset-0 bg-white/75 rounded-3xl flex items-center justify-center z-10">
              <Loader size={28} className="animate-spin text-sage-500" />
            </div>
          )}
          {inOtpStep ? (
            <OtpStep
              email={pendingEmail}
              onVerify={handleOtpVerify}
              onBack={handleBack}
              loading={loading}
              error={error}
            />
          ) : null}
          <form onSubmit={handleCredentialSubmit} className={`space-y-5${inOtpStep ? ' hidden' : ''}`} noValidate>
            <div>
              <label htmlFor="login-email" className="label">
                {t('auth.login.email')}
              </label>
              <div className="relative">
                <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <Mail size={16} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials((c) => ({ ...c, email: e.target.value }))}
                  placeholder={t('auth.login.emailPlaceholder')}
                  className="input ps-10"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="label">
                  {t('auth.login.password')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-sage-600 font-medium hover:text-sage-700 hover:underline transition-colors"
                  tabIndex={-1}
                >
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => setCredentials((c) => ({ ...c, password: e.target.value }))}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  className="input ps-10 pe-11"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
                  aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>}
            </div>

            {emailNotVerified && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-sm font-medium text-amber-800">{t('auth.login.emailNotVerified')}</p>
              </div>
            )}

            {!emailNotVerified && <ErrorBanner error={error} />}

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
