import { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronRight, ChevronLeft, Upload, Check,
  Loader2, AlertCircle, PackageCheck,
} from 'lucide-react';
import { ordersAPI, uploadsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── Constants ────────────────────────────────────────────────────────────────
const DELIVERY_OPTIONS = [
  { value: 'hand_to_hand', label: 'Hand to Hand',    desc: 'Direct delivery from artisan', icon: '🤝' },
  { value: 'office_pickup',label: 'Office Pickup',   desc: 'Pick up at our partner office', icon: '🏢' },
  { value: 'fast',         label: 'Fast Delivery',   desc: 'Express shipping to your door', icon: '🚀' },
];

const PAYMENT_OPTIONS = [
  { value: 'cash_on_delivery', label: 'Cash on Delivery', desc: 'Pay when you receive', icon: '💵' },
  { value: 'card',             label: 'Card Payment',     desc: 'Pay online securely',  icon: '💳' },
];

const STEPS = ['Details', 'Delivery', 'Contact'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function parseApiError(err) {
  return err?.response?.data?.message ?? err?.message ?? 'Something went wrong';
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                ${done   ? 'bg-sage-500 text-white'
                : active ? 'bg-sage-500 text-white ring-4 ring-sage-500/20'
                :          'bg-cream-200 text-warm-400'}`}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-[9px] font-semibold tracking-wide ${active ? 'text-sage-600' : 'text-warm-400'}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-10 h-px mb-4 transition-colors duration-300 ${i < current ? 'bg-sage-400' : 'bg-beige-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, required, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-semibold text-warm-700">
        {label}
        {required && <span className="text-danger">*</span>}
        {hint && <span className="text-warm-400 font-normal ml-1">— {hint}</span>}
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

// ─── Option Card ──────────────────────────────────────────────────────────────
function OptionCard({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all duration-150
        ${selected
          ? 'border-sage-500 bg-sage-50 ring-1 ring-sage-500/30'
          : 'border-beige-200 bg-white hover:border-sage-300 hover:bg-cream-100'
        }`}
    >
      <span className="text-xl flex-shrink-0">{option.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${selected ? 'text-sage-700' : 'text-warm-800'}`}>
          {option.label}
        </p>
        <p className="text-[10px] text-warm-400">{option.desc}</p>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors
        ${selected ? 'border-sage-500 bg-sage-500' : 'border-beige-200'}`}>
        {selected && <Check size={10} className="text-white m-auto" />}
      </div>
    </button>
  );
}

// ─── Image Upload Row ─────────────────────────────────────────────────────────
function ReferenceImages({ images, onChange, uploading, onUpload }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {images.map((url, i) => (
          <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-beige-200 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        ))}

        {images.length < 3 && (
          <label className={`w-16 h-16 rounded-xl border-2 border-dashed border-beige-200 hover:border-sage-400
            flex flex-col items-center justify-center gap-1 text-warm-400 hover:text-sage-500 transition-colors cursor-pointer
            ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading
              ? <Loader2 size={16} className="animate-spin" />
              : <><Upload size={14} /><span className="text-[9px]">Add</span></>
            }
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
        )}
      </div>
      <p className="text-[10px] text-warm-400">Up to 3 reference images (optional)</p>
    </div>
  );
}

// ─── Step 1: Order Details ────────────────────────────────────────────────────
function StepDetails({ form, errors, onChange, onImageUpload, uploadingImage }) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h3 className="text-base font-bold text-warm-900">Tell the artisan what you want</h3>
        <p className="text-xs text-warm-400 mt-0.5">Be as specific as possible — colors, size, material</p>
      </div>

      {/* Description */}
      <Field label="What do you want?" required error={errors.notes}>
        <textarea
          value={form.notes}
          onChange={e => onChange('notes', e.target.value)}
          placeholder="e.g. I'd like a hand-painted ceramic vase, 30cm tall, in turquoise and white with geometric Berber patterns..."
          rows={4}
          className={`w-full px-4 py-3 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 transition-colors resize-none
            ${errors.notes ? 'border-danger' : 'border-beige-200'}`}
        />
        <p className="text-[10px] text-warm-400 text-right">{form.notes.length}/500</p>
      </Field>

      {/* Budget range */}
      <Field label="Budget Range" hint="optional" error={errors.budget}>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-warm-400 font-medium">DZD</span>
            <input
              type="number"
              value={form.budget_min}
              onChange={e => onChange('budget_min', e.target.value)}
              placeholder="Min"
              className="w-full pl-12 pr-4 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400 transition-colors"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-warm-400 font-medium">DZD</span>
            <input
              type="number"
              value={form.budget_max}
              onChange={e => onChange('budget_max', e.target.value)}
              placeholder="Max"
              className="w-full pl-12 pr-4 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400 transition-colors"
            />
          </div>
        </div>
      </Field>

      {/* Deadline */}
      <Field label="Deadline" hint="optional — must be a future date" error={errors.deadline}>
        <input
          type="date"
          value={form.deadline}
          min={tomorrow()}
          onChange={e => onChange('deadline', e.target.value)}
          className="w-full px-4 py-2.5 text-sm bg-cream-100 border border-beige-200 rounded-2xl outline-none focus:border-sage-400 transition-colors"
        />
      </Field>

      {/* Reference images */}
      <Field label="Reference Images" hint="optional">
        <ReferenceImages
          images={form.reference_images}
          onChange={urls => onChange('reference_images', urls)}
          uploading={uploadingImage}
          onUpload={onImageUpload}
        />
      </Field>
    </div>
  );
}

// ─── Step 2: Delivery ─────────────────────────────────────────────────────────
function StepDelivery({ form, errors, onChange }) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h3 className="text-base font-bold text-warm-900">How do you want to receive it?</h3>
        <p className="text-xs text-warm-400 mt-0.5">Choose your delivery and payment preferences</p>
      </div>

      <Field label="Delivery Method" required error={errors.delivery_type}>
        <div className="space-y-2">
          {DELIVERY_OPTIONS.map(opt => (
            <OptionCard
              key={opt.value}
              option={opt}
              selected={form.delivery_type === opt.value}
              onSelect={v => onChange('delivery_type', v)}
            />
          ))}
        </div>
      </Field>

      <Field label="Payment Method" required error={errors.payment_method}>
        <div className="space-y-2">
          {PAYMENT_OPTIONS.map(opt => (
            <OptionCard
              key={opt.value}
              option={opt}
              selected={form.payment_method === opt.value}
              onSelect={v => onChange('payment_method', v)}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

// ─── Step 3: Contact ──────────────────────────────────────────────────────────
function StepContact({ form, errors, onChange }) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h3 className="text-base font-bold text-warm-900">Your contact details</h3>
        <p className="text-xs text-warm-400 mt-0.5">The artisan needs this to reach you</p>
      </div>

      <Field label="Full Name" required error={errors.client_name}>
        <input
          value={form.client_name}
          onChange={e => onChange('client_name', e.target.value)}
          placeholder="Your full name"
          className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 transition-colors
            ${errors.client_name ? 'border-danger' : 'border-beige-200'}`}
        />
      </Field>

      <Field label="Phone Number" required hint="+213 format" error={errors.client_phone}>
        <input
          value={form.client_phone}
          onChange={e => onChange('client_phone', e.target.value)}
          placeholder="+213 555 123 456"
          className={`w-full px-4 py-2.5 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 transition-colors
            ${errors.client_phone ? 'border-danger' : 'border-beige-200'}`}
        />
      </Field>

      <Field label="Delivery Address" required hint="full address, min 10 chars" error={errors.client_address}>
        <textarea
          value={form.client_address}
          onChange={e => onChange('client_address', e.target.value)}
          placeholder="Street, city, wilaya..."
          rows={3}
          className={`w-full px-4 py-3 text-sm bg-cream-100 border rounded-2xl outline-none focus:border-sage-400 transition-colors resize-none
            ${errors.client_address ? 'border-danger' : 'border-beige-200'}`}
        />
      </Field>
    </div>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────
function SuccessState({ onClose, onViewOrders }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-20 h-20 bg-sage-50 rounded-full flex items-center justify-center mx-auto">
        <PackageCheck size={36} className="text-sage-500" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-warm-900 mb-1">Order Sent!</h3>
        <p className="text-sm text-warm-400 leading-relaxed max-w-xs mx-auto">
          Your custom order has been sent to the artisan. They will review it and get back to you soon.
        </p>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={onViewOrders}
          className="w-full py-3 bg-sage-500 hover:bg-sage-600 text-white font-semibold text-sm rounded-2xl transition-colors"
        >
          View My Orders
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 bg-cream-200 hover:bg-beige-200 text-warm-700 font-semibold text-sm rounded-2xl transition-colors"
        >
          Continue Browsing
        </button>
      </div>
    </div>
  );
}

// ─── Main CustomOrderForm ─────────────────────────────────────────────────────
const EMPTY_FORM = {
  notes:            '',
  budget_min:       '',
  budget_max:       '',
  deadline:         '',
  reference_images: [],
  delivery_type:    '',
  payment_method:   '',
  client_name:      '',
  client_phone:     '',
  client_address:   '',
};

export default function CustomOrderForm() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [open,          setOpen]          = useState(false);
  const [product,       setProduct]       = useState(null);
  const [step,          setStep]          = useState(0);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [errors,        setErrors]        = useState({});
  const [submitting,    setSubmitting]    = useState(false);
  const [apiError,      setApiError]      = useState('');
  const [success,       setSuccess]       = useState(false);
  const [uploadingImg,  setUploadingImg]  = useState(false);

  // Pre-fill contact from user profile
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        client_name:  prev.client_name  || user.full_name  || '',
        client_phone: prev.client_phone || user.phone      || '',
      }));
    }
  }, [user]);

  // Listen for the CustomEvent fired by ProductPage "طلب مخصص" button
  const handleOpenEvent = useCallback((e) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    const p = e.detail?.product ?? null;
    setProduct(p);
    setForm({
      ...EMPTY_FORM,
      client_name:  user?.full_name || '',
      client_phone: user?.phone     || '',
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

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
    // Clear error on change
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  }

  // ── Per-step validation ──
  function validateStep(s) {
    const e = {};
    if (s === 0) {
      if (!form.notes.trim())         e.notes = 'Please describe what you want';
      if (form.notes.length > 500)    e.notes = 'Max 500 characters';
      if (form.budget_min && form.budget_max && Number(form.budget_min) > Number(form.budget_max))
        e.budget = 'Min budget cannot exceed max budget';
      if (form.deadline && form.deadline < tomorrow())
        e.deadline = 'Deadline must be in the future';
    }
    if (s === 1) {
      if (!form.delivery_type)  e.delivery_type  = 'Choose a delivery method';
      if (!form.payment_method) e.payment_method = 'Choose a payment method';
    }
    if (s === 2) {
      if (!form.client_name.trim())              e.client_name    = 'Full name is required';
      if (!form.client_phone.trim())             e.client_phone   = 'Phone number is required';
      else if (form.client_phone.length < 7)     e.client_phone   = 'Phone number too short';
      if (!form.client_address.trim())           e.client_address = 'Address is required';
      else if (form.client_address.length < 10)  e.client_address = 'Address too short (min 10 chars)';
    }
    return e;
  }

  function handleNext() {
    const errs = validateStep(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(s => s + 1);
  }

  function handleBack() {
    setErrors({});
    setStep(s => s - 1);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await uploadsAPI.uploadImage(fd);
      const url = res.data?.data?.url ?? res.data?.url ?? '';
      if (url) setField('reference_images', [...form.reference_images, url]);
    } catch { /* silent */ }
    finally { setUploadingImg(false); }
  }

  async function handleSubmit() {
    const errs = validateStep(2);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setApiError('');
    setSubmitting(true);

    // Build payload exactly matching the backend spec (section 4.4 of Project Brain)
    const payload = {
      // seller_id comes from the product object
      seller_id:        product?.seller_id ?? product?.seller?.id ?? product?.sellers?.id,
      product_id:       product?.id,
      notes:            form.notes.trim(),
      budget_min:       form.budget_min  ? Number(form.budget_min)  : undefined,
      budget_max:       form.budget_max  ? Number(form.budget_max)  : undefined,
      deadline:         form.deadline    || undefined,
      reference_images: form.reference_images.length ? form.reference_images : undefined,
      delivery_type:    form.delivery_type,
      payment_method:   form.payment_method,
      client_name:      form.client_name.trim(),
      client_phone:     form.client_phone.trim(),
      client_address:   form.client_address.trim(),
      is_custom:        true,
    };

    try {
      await ordersAPI.create(payload);
      setSuccess(true);
    } catch (err) {
      setApiError(parseApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setSuccess(false);
    setStep(0);
    setErrors({});
    setApiError('');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Sheet */}
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-beige-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pt-4 pb-3 flex items-start justify-between flex-shrink-0 border-b border-beige-100">
          <div>
            <h2 className="text-base font-bold text-warm-900">Custom Order Request</h2>
            {product && (
              <p className="text-xs text-warm-400 mt-0.5 truncate max-w-[220px]">
                For: <span className="text-warm-700 font-medium">{product.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-cream-200 flex items-center justify-center hover:bg-beige-200 transition-colors flex-shrink-0 mt-0.5"
          >
            <X size={16} className="text-warm-600" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {success ? (
            <SuccessState
              onClose={handleClose}
              onViewOrders={() => { handleClose(); navigate('/orders'); }}
            />
          ) : (
            <>
              <StepIndicator current={step} />

              {/* Global API error */}
              {apiError && (
                <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-100 text-danger text-sm rounded-2xl px-4 py-3">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {apiError}
                </div>
              )}

              {/* Step content */}
              {step === 0 && (
                <StepDetails
                  form={form}
                  errors={errors}
                  onChange={setField}
                  onImageUpload={handleImageUpload}
                  uploadingImage={uploadingImg}
                />
              )}
              {step === 1 && (
                <StepDelivery form={form} errors={errors} onChange={setField} />
              )}
              {step === 2 && (
                <StepContact form={form} errors={errors} onChange={setField} />
              )}
            </>
          )}
        </div>

        {/* Footer buttons */}
        {!success && (
          <div className="px-6 py-4 border-t border-beige-100 flex gap-3 flex-shrink-0 bg-white rounded-b-3xl">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-5 py-3 bg-cream-200 hover:bg-beige-200 text-warm-700 text-sm font-semibold rounded-2xl transition-colors"
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}

            {step < 2 ? (
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold rounded-2xl transition-colors"
              >
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold rounded-2xl transition-colors disabled:opacity-60"
              >
                {submitting
                  ? <><Loader2 size={15} className="animate-spin" /> Sending...</>
                  : <><PackageCheck size={15} /> Send Order Request</>
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}