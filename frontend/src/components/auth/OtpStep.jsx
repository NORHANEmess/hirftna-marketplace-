import { useEffect, useRef, useState } from 'react';
import { Loader, Mail, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../i18n/index.jsx';
import ErrorBanner from '../ui/ErrorBanner';

// Staggered bouncing dot — pure Tailwind
function Dot({ delay }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-sage-400 inline-block animate-bounce"
      style={{ animationDelay: delay, animationDuration: '1.1s' }}
    />
  );
}

export default function OtpStep({ email, onVerify, onBack, loading, error }) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState(Array(6).fill(''));
  const refs = useRef([]);

  // "arriving" phase: show the animated envelope + dots for 2.8 s then settle
  const [arriving, setArriving] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setArriving(false), 2800);
    return () => clearTimeout(id);
  }, []);

  const isComplete = digits.every((d) => d !== '');

  useEffect(() => {
    const id = setTimeout(() => refs.current[0]?.focus(), 300);
    return () => clearTimeout(id);
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

      {/* ── Animated header ──────────────────────────────────────── */}
      <div
        className={`rounded-2xl border px-4 py-4 transition-all duration-700 ${
          arriving ? 'bg-sage-50 border-sage-200' : 'bg-cream-100 border-beige-200'
        }`}
      >
        <div className="flex items-center gap-3">

          {/* Icon with ripple rings while arriving */}
          <div className="relative flex-shrink-0">
            {arriving && (
              <>
                <span className="absolute inset-0 rounded-2xl bg-sage-300 opacity-40 animate-ping" />
                <span
                  className="absolute inset-0 rounded-2xl bg-sage-200 opacity-30 animate-ping"
                  style={{ animationDelay: '0.35s' }}
                />
              </>
            )}
            <div
              className={`relative w-10 h-10 rounded-2xl flex items-center justify-center transition-colors duration-700 ${
                arriving ? 'bg-sage-200' : 'bg-sage-100'
              }`}
            >
              {arriving ? (
                <Mail size={18} className="text-sage-700 animate-pulse" />
              ) : (
                <ShieldCheck size={18} className="text-sage-600" />
              )}
            </div>
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-warm-900">
              {arriving ? t('auth.otp.sending') : t('auth.login.otpTitle')}
            </p>

            {arriving ? (
              /* Animated dots while sending */
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-warm-500">{t('auth.otp.checkingInbox')}</span>
                <span className="flex items-center gap-0.5 ms-1">
                  <Dot delay="0ms" />
                  <Dot delay="180ms" />
                  <Dot delay="360ms" />
                </span>
              </div>
            ) : (
              <p className="text-xs text-warm-500">
                {t('auth.otp.sentTo')}{' '}
                <span className="font-medium text-warm-700 break-all">{email}</span>
              </p>
            )}
          </div>
        </div>

        {/* Progress bar — shrinks from full to zero over the arriving window */}
        {arriving && (
          <div className="mt-3 h-0.5 w-full rounded-full bg-sage-100 overflow-hidden">
            <div
              className="h-full bg-sage-400 rounded-full"
              style={{
                animation: 'otp-progress 2.8s linear forwards',
              }}
            />
          </div>
        )}
      </div>

      {/* ── 6 digit inputs ───────────────────────────────────────── */}
      <div
        className={`transition-all duration-500 ${arriving ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}
      >
        <label className="label mb-2 block text-center">{t('auth.login.otpLabel')}</label>
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              disabled={loading || arriving}
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
        disabled={loading || !isComplete || arriving}
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

      {/* Keyframe for the progress bar — injected once */}
      <style>{`
        @keyframes otp-progress {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>

    </form>
  );
}
