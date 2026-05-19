import { useState } from 'react';
import { useTranslation } from '../../i18n/index.jsx';
import Modal from '../ui/Modal';

export default function PaymentStep({ order, onComplete, onClose }) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const isCash = order.payment_method === 'cash_on_delivery';
  const price = order.final_price || order.total_amount || 0;

  const handleConfirm = async () => {
    if (isCash) {
      await onComplete();
    } else {
      setProcessing(true);
      setTimeout(async () => {
        setProcessing(false);
        setSuccess(true);
        setTimeout(() => onComplete(), 1500);
      }, 2000);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('payment.title', 'Complete Order')} size="sm">
      <div className="space-y-4 pb-2">
        {/* Amount display */}
        <div className="text-center py-4 bg-cream-50 rounded-xl">
          <p className="text-xs text-warm-400 uppercase tracking-wide mb-1">
            {t('payment.amount_to_pay', 'Amount')}
          </p>
          <p className="text-3xl font-bold text-warm-800">
            {Number(price).toLocaleString()} DA
          </p>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-sage-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-warm-800">{t('payment.success', 'Payment Successful!')}</p>
            <p className="text-sm text-warm-400 mt-1">{t('payment.completing', 'Completing your order...')}</p>
          </div>
        ) : isCash ? (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-beige-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-sage-50 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-warm-800">{t('payment.cash_title', 'Cash on Delivery')}</p>
                <p className="text-xs text-warm-400">{t('payment.cash_desc', 'Confirm that you received the product and paid the artisan')}</p>
              </div>
            </div>
            <button onClick={handleConfirm} className="w-full py-3 bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold rounded-2xl transition-colors">
              {t('payment.confirm_received', 'Yes, I Received & Paid')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-beige-200 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-brick-50 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-brick-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-warm-800">{t('payment.card_title', 'Card Payment')}</p>
                <p className="text-xs text-warm-400">{t('payment.card_desc', 'Secure payment via Chargily')}</p>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={processing}
              className="w-full py-3 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-white text-sm font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('payment.processing', 'Processing...')}
                </>
              ) : (
                t('payment.pay_now', 'Pay Now')
              )}
            </button>
            <p className="text-[11px] text-center text-warm-300">
              {t('payment.chargily_note', 'Powered by Chargily — Algerian secure payment')}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
