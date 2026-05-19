import { useEffect, useRef, useState } from 'react';
import { Loader, Mail } from 'lucide-react';
import { useTranslation } from '../../i18n/index.jsx';
import ErrorBanner from '../ui/ErrorBanner';

export default function OtpStep({ email, onVerify, onBack, loading, error }) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState(Array(6).fill(''));
  const refs = useRef([]);

  const isComplete = digits.every((d) => d !== '');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = [...digits];
        next[i] = '';
        setDigits(next);
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isComplete && !loading) onVerify(digits.join(''));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

      {/* Header */}
      <div className="rounded-2xl bg-cream-100 border border-beige-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sage-100 flex items-center justify-center flex-shrink-0">
            <Mail size={18} className="text-sage-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-warm-900">{t('auth.login.otpTitle')}</p>
            <p className="text-xs text-warm-500">
              {t('auth.otp.sentTo')}{' '}
              <span className="font-medium text-warm-700 break-all">{email}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 6 digit inputs — fixed 40×40px each, centered */}
      <div>
        <label className="label mb-2 block text-center">{t('auth.login.otpLabel')}</label>
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              disabled={loading}
              className={`
                w-10 h-10 shrink-0 text-center text-lg font-bold rounded-xl border-2 outline-none transition-all
                ${digit
                  ? 'border-sage-400 bg-sage-50 text-warm-900'
                  : 'border-beige-300 bg-cream-50 text-warm-500'}
                focus:border-sage-500 focus:bg-white
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            />
          ))}
        </div>
      </div>

      <ErrorBanner error={error} />

      <button
        type="submit"
        disabled={loading || !isComplete}
        className="btn-primary w-full py-3 text-sm"
      >
        {loading ? (
          <><Loader size={15} className="animate-spin inline mr-1.5" />{t('auth.login.otpSubmitting')}</>
        ) : (
          t('auth.login.otpSubmit')
        )}
      </button>

      <p className="text-center text-xs text-warm-400">
        {t('auth.otp.noCode')}{' '}
        <button
          type="button"
          onClick={onBack}
          className="text-sage-600 font-semibold hover:underline"
        >
          {t('auth.otp.tryAgain')}
        </button>
      </p>

    </form>
  );
}
