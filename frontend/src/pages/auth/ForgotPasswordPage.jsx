import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader, Mail } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useTranslation } from '../../i18n/index.jsx';
import LogoMark from '../../components/ui/LogoMark';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
    } catch {
      // Always show success — never reveal whether an email is registered
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-cream-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><LogoMark size="lg" /></div>
          <p className="text-sm text-warm-500">
            {submitted ? t('auth.forgotPassword.successTitle') : t('auth.forgotPassword.subtitle')}
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-beige-200 shadow-soft p-7">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-sage-50 border border-sage-200 rounded-2xl flex items-center justify-center mx-auto">
                <Mail size={24} className="text-sage-600" />
              </div>
              <p className="text-sm text-warm-600 leading-relaxed">
                {t('auth.forgotPassword.successMessage')}
              </p>
              <Link
                to="/login"
                className="block text-center text-sm text-sage-600 font-semibold hover:text-sage-700 hover:underline transition-colors mt-2"
              >
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="forgot-email" className="label">
                  {t('auth.forgotPassword.emailLabel')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400">
                    <Mail size={16} />
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.forgotPassword.emailPlaceholder')}
                    className="input pl-10"
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary w-full py-3 text-sm mt-1"
              >
                {loading ? (
                  <><Loader size={15} className="animate-spin" /> {t('auth.forgotPassword.submitting')}</>
                ) : (
                  t('auth.forgotPassword.submit')
                )}
              </button>

              <p className="text-center text-sm text-warm-500 mt-1">
                <Link
                  to="/login"
                  className="text-sage-600 font-semibold hover:text-sage-700 hover:underline transition-colors"
                >
                  {t('auth.forgotPassword.backToLogin')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
