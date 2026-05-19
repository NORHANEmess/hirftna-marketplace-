import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  PackageCheck,
  Truck,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI, uploadsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n/index.jsx';

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
}

function Field({ label, required, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-semibold text-warm-700">
        {label}
        {required && <span className="text-danger">*</span>}
        {hint && <span className="text-warm-400 font-normal ml-1">- {hint}</span>}
      </label>
      {children}
      {error && (
        <p className="text-[10px] text-danger flex items-center gap-1">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

function OptionCard({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-150 ${
        selected ? 'border-sage-500 bg-sage-50 ring-1 ring-sage-500/30' : 'border-beige-200 bg-white hover:border-sage-300'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${selected ? 'bg-sage-100' : 'bg-cream-200'}`}>
        <option.icon size={17} className={selected ? 'text-sage-600' : 'text-warm-500'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${selected ? 'text-sage-700' : 'text-warm-800'}`}>{option.label}</p>
        <p className="text-[10px] text-warm-400">{option.desc}</p>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selected ? 'border-sage-500 bg-sage-500' : 'border-beige-200'}`}>
        {selected && <Check size={10} className="text-white m-auto" />}
      </div>
    </button>
  );
}

function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((label, index) => {
        const done = index < currentStep;
        const active = index === currentStep;

        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                done ? 'bg-sage-500 text-white' : active ? 'bg-sage-500 text-white ring-4 ring-sage-500/20' : 'bg-cream-200 text-warm-400'
              }`}
              >
                {done ? <Check size={14} /> : index + 1}
              </div>
              <span className={`text-[9px] font-semibold tracking-wide ${active ? 'text-sage-600' : 'text-warm-400'}`}>
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-10 h-px mb-4 ${index < currentStep ? 'bg-sage-400' : 'bg-beige-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SuccessState({ onClose, onViewOrders }) {
  const { t } = useTranslation();

  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-20 h-20 bg-sage-50 rounded-full flex items-center justify-center mx-auto">
        <PackageCheck size={36} className="text-sage-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-warm-900 mb-1">{t('customOrder.success.title')}</h3>
        <p className="text-sm text-warm-400 leading-relaxed max-w-xs mx-auto">
          {t('customOrder.success.subtitle')}
        </p>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <button onClick={onViewOrders} className="w-full py-3 bg-sage-500 hover:bg-sage-600 text-white font-semibold text-sm rounded-2xl transition-colors">
          {t('customOrder.success.viewOrders')}
        </button>
        <button onClick={onClose} className="w-full py-3 bg-cream-200 hover:bg-beige-200 text-warm-700 font-semibold text-sm rounded-2xl transition-colors">
          {t('customOrder.success.continueBrowsing')}
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  requirements: '',
  budget_min: '',
  budget_max: '',
  deadline: '',
  reference_images: [],
  delivery_type: '',
  payment_method: '',
  client_name: '',
  client_phone: '',
  client_address: '',
};

export default function CustomOrderForm() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const deliveryOptions = useMemo(() => ([
    {
      value: 'hand_to_hand',
      label: t('customOrder.step2.delivery.hand_to_hand'),
      desc: t('customOrder.step2.delivery.hand_to_hand_desc'),
      icon: Truck,
    },
    {
      value: 'office_pickup',
      label: t('customOrder.step2.delivery.office_pickup'),
      desc: t('customOrder.step2.delivery.office_pickup_desc'),
      icon: Building2,
    },
    {
      value: 'fast',
      label: t('customOrder.step2.delivery.fast'),
      desc: t('customOrder.step2.delivery.fast_desc'),
      icon: Zap,
    },
  ]), [t]);

  const paymentOptions = useMemo(() => ([
    {
      value: 'cash_on_delivery',
      label: t('customOrder.step2.payment.cash_on_delivery'),
      desc: t('customOrder.step2.payment.cash_on_delivery_desc'),
      icon: Banknote,
    },
    {
      value: 'card',
      label: t('customOrder.step2.payment.card'),
      desc: t('customOrder.step2.payment.card_desc'),
      icon: CreditCard,
    },
  ]), [t]);

  const steps = useMemo(() => ([
    t('customOrder.steps.details'),
    t('customOrder.steps.delivery'),
    t('customOrder.steps.contact'),
  ]), [t]);

  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((current) => ({
        ...current,
        client_name: current.client_name || user.full_name || '',
        client_phone: current.client_phone || user.phone || '',
      }));
    }
  }, [user]);

  const handleOpenEvent = useCallback((event) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const nextProduct = event.detail?.product ?? null;
    setProduct(nextProduct);
    setForm({
      ...EMPTY_FORM,
      client_name: user?.full_name || '',
      client_phone: user?.phone || '',
    });
    setStep(0);
    setErrors({});
    setApiError('');
    setSuccess(false);
    setOpen(true);
  }, [isAuthenticated, navigate, user]);

  useEffect(() => {
    window.addEventListener('open-order-form', handleOpenEvent);
    return () => window.removeEventListener('open-order-form', handleOpenEvent);
  }, [handleOpenEvent]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: '' }));
    }
  };

  const validateStep = (currentStep) => {
    const nextErrors = {};

    if (currentStep === 0) {
      if (!form.requirements.trim()) {
        nextErrors.requirements = t('validation.orders.requirements');
      } else if (form.requirements.length > 500) {
        nextErrors.requirements = t('validation.orders.requirementsMax');
      }

      if (
        form.budget_min &&
        form.budget_max &&
        Number(form.budget_min) > Number(form.budget_max)
      ) {
        nextErrors.budget = t('validation.orders.budgetRange');
      }
    }

    if (currentStep === 1) {
      if (!form.delivery_type) {
        nextErrors.delivery_type = t('validation.orders.deliveryMethod');
      }

      if (!form.payment_method) {
        nextErrors.payment_method = t('validation.orders.paymentMethod');
      }
    }

    if (currentStep === 2) {
      if (!form.client_name.trim()) {
        nextErrors.client_name = t('validation.required');
      }

      if (!form.client_phone.trim()) {
        nextErrors.client_phone = t('validation.orders.phone');
      } else if (form.client_phone.length < 7) {
        nextErrors.client_phone = t('validation.orders.phoneShort');
      }

      if (!form.client_address.trim()) {
        nextErrors.client_address = t('validation.orders.address');
      } else if (form.client_address.length < 10) {
        nextErrors.client_address = t('validation.orders.addressShort');
      }
    }

    return nextErrors;
  };

  const handleNext = () => {
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setStep((current) => current + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep((current) => current - 1);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await uploadsAPI.uploadImage(formData);
      const url = response.data?.data?.url ?? response.data?.url ?? '';

      if (url) {
        setField('reference_images', [...form.reference_images, url]);
      }
    } catch {
      setApiError(t('common.unknownError'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    const stepErrors = validateStep(2);
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
      return;
    }

    setApiError('');
    setSubmitting(true);

    if (!product?.id) {
      setApiError(t('validation.orders.productMissing'));
      setSubmitting(false);
      return;
    }

    const payload = {
      product_id: product.id,
      quantity: 1,
      requirements: form.requirements.trim(),
      notes: form.requirements.trim(),
      delivery_type: form.delivery_type,
      payment_method: form.payment_method,
      client_name: form.client_name.trim(),
      client_phone: form.client_phone.trim(),
      client_address: form.client_address.trim(),
    };

    if (form.budget_min) {
      payload.budget_min = Number(form.budget_min);
    }

    if (form.budget_max) {
      payload.budget_max = Number(form.budget_max);
    }

    if (form.deadline) {
      payload.deadline = form.deadline;
    }

    if (form.reference_images.length > 0) {
      payload.reference_images = form.reference_images;
    }

    try {
      await ordersAPI.create(payload);
      setSuccess(true);
    } catch (requestError) {
      setApiError(requestError?.response?.data?.message ?? t('common.unknownError'));
      setErrors(requestError?.response?.data?.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSuccess(false);
    setStep(0);
    setErrors({});
    setApiError('');
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-beige-200 rounded-full" />
        </div>
        <div className="px-6 pt-4 pb-3 flex items-start justify-between flex-shrink-0 border-b border-beige-100">
          <div>
            <h2 className="text-base font-bold text-warm-900">{t('customOrder.title')}</h2>
            {product && (
              <p className="text-xs text-warm-400 mt-0.5 truncate max-w-[220px]">
                {t('customOrder.for', { name: product.name })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center hover:bg-beige-200 transition-colors"
          >
            <X size={16} className="text-warm-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {success ? (
            <SuccessState onClose={handleClose} onViewOrders={() => { handleClose(); navigate('/orders'); }} />
          ) : (
            <>
              <StepIndicator steps={steps} currentStep={step} />

              {apiError && (
                <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-100 text-danger text-sm rounded-2xl px-4 py-3">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {apiError}
                </div>
              )}

              {step === 0 && (
                <div className="space-y-5">
                  <div className="text-center mb-2">
                    <h3 className="text-base font-bold text-warm-900">{t('customOrder.step1.title')}</h3>
                    <p className="text-xs text-warm-400 mt-0.5">{t('customOrder.step1.subtitle')}</p>
                  </div>

                  <Field label={t('customOrder.step1.descLabel')} required error={errors.requirements}>
                    <textarea
                      value={form.requirements}
                      onChange={(event) => setField('requirements', event.target.value)}
                      placeholder={t('customOrder.step1.descPlaceholder')}
                      rows={4}
                      className={`w-full px-4 py-3 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 resize-none ${
                        errors.requirements ? 'border-danger' : 'border-beige-200'
                      }`}
                    />
                    <p className="text-[10px] text-warm-400 text-right">{form.requirements.length}/500</p>
                  </Field>

                  <Field label={t('customOrder.step1.budgetLabel')} hint={t('common.optional')} error={errors.budget}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-warm-400">{t('common.currency')}</span>
                        <input
                          type="number"
                          value={form.budget_min}
                          onChange={(event) => setField('budget_min', event.target.value)}
                          placeholder={t('customOrder.step1.budgetMin')}
                          className="w-full pl-12 pr-4 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-warm-400">{t('common.currency')}</span>
                        <input
                          type="number"
                          value={form.budget_max}
                          onChange={(event) => setField('budget_max', event.target.value)}
                          placeholder={t('customOrder.step1.budgetMax')}
                          className="w-full pl-12 pr-4 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400"
                        />
                      </div>
                    </div>
                  </Field>

                  <Field label={t('customOrder.step1.deadlineLabel')} hint={t('customOrder.step1.deadlineHint')} error={errors.deadline}>
                    <input
                      type="date"
                      value={form.deadline}
                      min={tomorrow()}
                      onChange={(event) => setField('deadline', event.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400"
                    />
                  </Field>

                  <Field
                    label={t('customOrder.step1.imagesLabel')}
                    hint={t('customOrder.step1.imagesHint')}
                    error={errors.reference_images}
                  >
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        {form.reference_images.map((url, index) => (
                          <div key={url || index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-beige-200 group">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setField('reference_images', form.reference_images.filter((_, itemIndex) => itemIndex !== index))}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center"
                            >
                              <X size={14} className="text-white" />
                            </button>
                          </div>
                        ))}

                        {form.reference_images.length < 3 && (
                          <label className={`w-16 h-16 rounded-xl border-2 border-dashed border-beige-200 hover:border-sage-400 flex flex-col items-center justify-center gap-1 text-warm-400 hover:text-sage-500 cursor-pointer ${
                            uploadingImage ? 'opacity-50 pointer-events-none' : ''
                          }`}
                          >
                            {uploadingImage ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <>
                                <Upload size={14} />
                                <span className="text-[9px]">{t('customOrder.step1.imagesLimit')}</span>
                              </>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                          </label>
                        )}
                      </div>
                    </div>
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div className="text-center mb-2">
                    <h3 className="text-base font-bold text-warm-900">{t('customOrder.step2.title')}</h3>
                    <p className="text-xs text-warm-400 mt-0.5">{t('customOrder.step2.subtitle')}</p>
                  </div>

                  <Field label={t('customOrder.step2.deliveryLabel')} required error={errors.delivery_type}>
                    <div className="space-y-2">
                      {deliveryOptions.map((option) => (
                        <OptionCard
                          key={option.value}
                          option={option}
                          selected={form.delivery_type === option.value}
                          onSelect={(value) => setField('delivery_type', value)}
                        />
                      ))}
                    </div>
                  </Field>

                  <Field label={t('customOrder.step2.paymentLabel')} required error={errors.payment_method}>
                    <div className="space-y-2">
                      {paymentOptions.map((option) => (
                        <OptionCard
                          key={option.value}
                          option={option}
                          selected={form.payment_method === option.value}
                          onSelect={(value) => setField('payment_method', value)}
                        />
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div className="text-center mb-2">
                    <h3 className="text-base font-bold text-warm-900">{t('customOrder.step3.title')}</h3>
                    <p className="text-xs text-warm-400 mt-0.5">{t('customOrder.step3.subtitle')}</p>
                  </div>

                  <Field label={t('customOrder.step3.nameLabel')} required error={errors.client_name}>
                    <input
                      value={form.client_name}
                      onChange={(event) => setField('client_name', event.target.value)}
                      className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 ${
                        errors.client_name ? 'border-danger' : 'border-beige-200'
                      }`}
                    />
                  </Field>

                  <Field label={t('customOrder.step3.phoneLabel')} required error={errors.client_phone}>
                    <input
                      value={form.client_phone}
                      onChange={(event) => setField('client_phone', event.target.value)}
                      className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 ${
                        errors.client_phone ? 'border-danger' : 'border-beige-200'
                      }`}
                    />
                  </Field>

                  <Field label={t('customOrder.step3.addressLabel')} required error={errors.client_address}>
                    <textarea
                      value={form.client_address}
                      onChange={(event) => setField('client_address', event.target.value)}
                      rows={3}
                      className={`w-full px-4 py-3 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 resize-none ${
                        errors.client_address ? 'border-danger' : 'border-beige-200'
                      }`}
                    />
                  </Field>
                </div>
              )}
            </>
          )}
        </div>

        {!success && (
          <div className="px-6 py-4 border-t border-beige-100 flex gap-3 flex-shrink-0 bg-white rounded-b-3xl">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 px-5 py-3 bg-cream-200 hover:bg-beige-200 text-warm-700 text-sm font-semibold rounded-2xl transition-colors"
              >
                <ChevronLeft size={15} /> {t('common.back')}
              </button>
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold rounded-2xl transition-colors"
              >
                {t('customOrder.next')} <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold rounded-2xl transition-colors disabled:opacity-60"
              >
                {submitting ? (
                  <><Loader2 size={15} className="animate-spin" /> {t('customOrder.submitting')}</>
                ) : (
                  <><PackageCheck size={15} /> {t('customOrder.submit')}</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
