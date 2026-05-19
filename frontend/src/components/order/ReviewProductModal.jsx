import { useState } from 'react';
import { AlertCircle, Loader2, Package, Star, X } from 'lucide-react';
import { getApiErrorMessage, reviewsAPI } from '../../services/api';
import { useTranslation } from '../../i18n/index.jsx';

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            size={28}
            className={`transition-colors ${
              star <= active ? 'fill-warning text-warning' : 'fill-beige-200 text-beige-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS = {
  1: { en: 'Poor',      ar: 'ضعيف' },
  2: { en: 'Fair',      ar: 'مقبول' },
  3: { en: 'Good',      ar: 'جيد' },
  4: { en: 'Very Good', ar: 'جيد جداً' },
  5: { en: 'Excellent', ar: 'ممتاز' },
};

export default function ReviewProductModal({ order, product, onClose, onSuccess }) {
  const { t, lang } = useTranslation();
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const thumbnail = product.images?.[0]?.image_url ?? null;

  async function handleSubmit() {
    if (!rating) {
      setError(t('reviewProduct.ratingRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await reviewsAPI.createReview({
        order_id:   order.id,
        product_id: product.id,
        rating,
        comment:    comment.trim() || undefined,
      });
      setDone(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(getApiErrorMessage(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-6 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-warm-900">{t('reviewProduct.title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-cream-200 hover:bg-beige-200 text-warm-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {done ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-sage-50 rounded-3xl flex items-center justify-center mx-auto mb-3">
                <Star size={24} className="fill-warning text-warning" />
              </div>
              <p className="font-bold text-warm-900">{t('reviewProduct.success')}</p>
              <p className="text-xs text-warm-400 mt-1">{t('reviewProduct.successSub')}</p>
            </div>
          ) : (
            <>
              {/* Product info */}
              <div className="flex items-center gap-3 bg-cream-100 rounded-2xl px-3 py-2.5">
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={product.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-beige-200 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-warm-400" />
                  </div>
                )}
                <p className="text-sm font-semibold text-warm-800 leading-snug">{product.name}</p>
              </div>

              {/* Star picker */}
              <div className="flex flex-col items-center gap-2 py-1">
                <StarPicker value={rating} onChange={setRating} />
                {rating > 0 && (
                  <p className="text-xs font-semibold text-warm-500">
                    {RATING_LABELS[rating]?.[lang] ?? RATING_LABELS[rating]?.en}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider block mb-1.5">
                  {t('reviewProduct.commentLabel')}
                  <span className="ml-1 normal-case text-warm-300">{t('reviewProduct.commentHint')}</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t('reviewProduct.commentPlaceholder')}
                  rows={3}
                  maxLength={500}
                  className="w-full text-sm bg-cream-100 border border-beige-200 rounded-2xl px-3 py-2.5 outline-none focus:border-sage-400 resize-none transition-colors"
                />
                <p className="text-right text-[10px] text-warm-300 mt-1">{comment.length}/500</p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-danger text-xs rounded-xl px-3 py-2">
                  <AlertCircle size={12} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-2xl bg-cream-200 text-warm-600 text-sm font-semibold hover:bg-beige-200 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !rating}
                  className="flex-1 py-2.5 rounded-2xl bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Star size={14} />}
                  {t('reviewProduct.submit')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
