import { AlertCircle, WifiOff } from 'lucide-react';
import { resolveApiError } from '../../services/api';

/**
 * Displays a styled error banner from an API error object or a plain string.
 *
 * Usage:
 *   <ErrorBanner error={err} />                          ← API error object
 *   <ErrorBanner error="Email is already in use" />      ← plain string
 *   <ErrorBanner error={err} fallback="Custom fallback" />
 */
export default function ErrorBanner({ error, fallback, className = '' }) {
  if (!error) return null;

  let message, hint, isNetwork;

  if (typeof error === 'string') {
    message   = error;
    hint      = null;
    isNetwork = false;
  } else {
    const resolved = resolveApiError(error, fallback);
    message   = resolved.message;
    hint      = resolved.hint;
    isNetwork = resolved.status === null;
  }

  const Icon = isNetwork ? WifiOff : AlertCircle;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 ${className}`}
    >
      <Icon size={15} className="text-danger mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-danger leading-snug font-medium">{message}</p>
        {hint && (
          <p className="text-xs text-danger/70 mt-0.5 leading-snug">{hint}</p>
        )}
      </div>
    </div>
  );
}
