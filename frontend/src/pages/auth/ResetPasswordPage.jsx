import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader, Lock } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useTranslation } from '../../i18n/index.jsx';
import LogoMark from '../../components/ui/LogoMark';

function PasswordStrength({ password }) {
  const { t } = useTranslation();
  if (!password) return null;

  const strength = (() => {
    if (password.length < 6) return { label: t('auth.register.strength.veryWeak'), color: 'bg-danger', width: '25%' };
    if (password.length < 8) return { label: t('auth.register.strength.weak'), color: 'bg-orange-400', width: '50%' };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password))
      return { label: t('auth.register.strength.medium'), color: 'bg-warning', width: '75%' };
    return { label: t('auth.register.strength.strong'), color: 'bg-sage-500', width: '100%' };
  })();

  return (
    <div className="mt-1.5">
      <div className="h-1 w-full bg-beige-200 rounded-full overflow-hidden">
        <div className={`h-full ${strength.color} transition-all`} style={{ width: strength.width }} />
      </div>
      <p className="text-[10px] text-warm-400 mt-0.5">{strength.label}</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');

  const [form, setForm] = useState({ new_password: '', confirm_password: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/login', { replace: true }), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-cream-100">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl border border-beige-200 shadow-soft p-7 text-center space-y-4">
            <p className="text-sm font-semibold text-danger">{t('auth.resetPassword.invalidToken')}</p>
            <Link
              to="/forgot-password"
              className="inline-block text-sm text-sage-600 font-semibold hover:text-sage-700 hover:underline transition-colors"
            >
              {t('auth.resetPassword.requestNew')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.new_password.length < 8) {
      setError(t('auth.resetPassword.errorPasswordLength'));
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError(t('auth.resetPassword.errorPasswordMatch'));
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, form.new_password);
      setSuccess(true);
    } catch (err) {
      const msg = err?.response?.data?.message || '';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setError(t('auth.resetPassword.errorExpired'));
      } else {
        setError(t('auth.resetPassword.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-cream-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><LogoMark size="lg" /></div>
          <p className="text-sm text-warm-500">
            {success ? t('auth.resetPassword.successTitle') : t('auth.resetPassword.subtitle')}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-beige-200 shadow-soft p-7">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-sage-50 border border-sage-200 rounded-2xl flex items-center justify-center mx-auto">
                <Lock size={24} className="text-sage-600" />
              </div>
              <p className="text-sm text-warm-600 leading-relaxed">
                {t('auth.resetPassword.successMessage')}
              </p>
              <p className="text-xs text-warm-400">{t('auth.resetPassword.redirecting')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="reset-password" className="label">
                  {t('auth.resetPassword.newPasswordLabel')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                    <Lock size={16} />
                  </span>
                  <input
                    id="reset-password"
                    type={showPw ? 'text' : 'password'}
                    value={form.new_password}
                    onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
                    placeholder="••••••••"
                    className="input pl-10 pr-11"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
                    aria-label={showPw ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrength password={form.new_password} />
              </div>

              <div>
                <label htmlFor="reset-confirm" className="label">
                  {t('auth.resetPassword.confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                    <Lock size={16} />
                  </span>
                  <input
                    id="reset-confirm"
                    type={showConf ? 'text' : 'password'}
                    value={form.confirm_password}
                    onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
                    placeholder="••••••••"
                    className="input pl-10 pr-11"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConf((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 transition-colors"
                    aria-label={showConf ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                  >
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-sm text-danger">{error}</p>
                  {error === t('auth.resetPassword.errorExpired') && (
                    <Link
                      to="/forgot-password"
                      className="text-xs text-sage-600 font-semibold hover:underline mt-1 inline-block"
                    >
                      {t('auth.resetPassword.requestNew')}
                    </Link>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm mt-1"
              >
                {loading ? (
                  <><Loader size={15} className="animate-spin" /> {t('auth.resetPassword.submitting')}</>
                ) : (
                  t('auth.resetPassword.submit')
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
