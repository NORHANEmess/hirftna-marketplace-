import { useState } from 'react';
import { CreditCard, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { useTranslation } from '../../i18n/index.jsx';

export default function PaymentModal({ amount, description, onPaymentDeclared, onClose }) {
  const { t } = useTranslation();
  const [declared, setDeclared] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [copied, setCopied] = useState(false);

  const accountNumber = t('payment.ccp_account');

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDeclare = async () => {
    setDeclaring(true);
    await new Promise((r) => setTimeout(r, 600));
    setDeclaring(false);
    setDeclared(true);
    onPaymentDeclared?.();
  };

  return (
    <Modal isOpen onClose={onClose} title={t('payment.platform_title')} size="sm">
      <div className="space-y-4 pb-2">
        {/* Amount + description */}
        <div className="bg-cream-100 rounded-2xl px-4 py-3 space-y-1 text-center">
          <p className="text-[10px] uppercase tracking-widest text-warm-400 font-semibold">
            {t('payment.platform_amount')}
          </p>
          <p className="text-3xl font-bold text-warm-900">
            {Number(amount).toLocaleString()} DA
          </p>
          <p className="text-xs text-warm-500">{t('payment.platform_for')}: {description}</p>
        </div>

        {declared ? (
          /* ── Success state ── */
          <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 size={28} className="text-sage-600" />
            <p className="text-sm font-bold text-sage-800">{t('payment.payment_declared')}</p>
            <p className="text-xs text-sage-600">{t('payment.declare_note')}</p>
            <button onClick={onClose} className="mt-1 text-xs font-semibold text-sage-600 underline underline-offset-2">
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            {/* ── CCP transfer block ── */}
            <div className="border border-beige-200 rounded-2xl overflow-hidden">
              <div className="bg-cream-200 px-4 py-2.5 border-b border-beige-200">
                <p className="text-[10px] font-bold text-warm-600 uppercase tracking-widest">
                  {t('payment.ccp_title')}
                </p>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                <div>
                  <p className="text-[10px] text-warm-400 mb-0.5">{t('orders.card.artisanFallback', 'Name')}</p>
                  <p className="text-sm font-semibold text-warm-800">{t('payment.ccp_name')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-warm-400 mb-0.5">RIP / CCP</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-warm-800 font-mono flex-1">
                      {accountNumber}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs text-sage-600 hover:text-sage-700 transition-colors shrink-0"
                    >
                      {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                      {copied ? t('common.verified') : 'Copy'}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-warm-400 leading-relaxed">{t('payment.ccp_note')}</p>
              </div>
            </div>

            {/* ── Card (coming soon) ── */}
            <div className="border border-beige-100 rounded-2xl overflow-hidden opacity-50">
              <div className="bg-cream-100 px-4 py-2.5 border-b border-beige-100 flex items-center gap-2">
                <CreditCard size={14} className="text-warm-400" />
                <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest">
                  {t('payment.card_title')} — {t('payment.card_coming_soon')}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-warm-400">{t('payment.chargily_note')}</p>
              </div>
            </div>

            {/* ── CTA ── */}
            <button
              type="button"
              onClick={handleDeclare}
              disabled={declaring}
              className="w-full flex items-center justify-center gap-2 py-3 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-white text-sm font-semibold rounded-2xl transition-colors"
            >
              {declaring
                ? <Loader2 size={15} className="animate-spin" />
                : <CheckCircle2 size={15} />}
              {t('payment.declare_payment')}
            </button>

            <p className="text-[10px] text-center text-warm-400 leading-relaxed">
              {t('payment.declare_note')}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
