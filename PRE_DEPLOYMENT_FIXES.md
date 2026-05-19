# PRE-DEPLOYMENT FIXES — Hirftna Marketplace
> Audit completed: 2026-05-19 | 8-phase forensic audit across all backend + frontend files
> Issues: 3 Critical · 8 High · 9 Medium · 7 Low

---

## 🔴 CRITICAL — Must Fix Before Deployment

These issues will cause **immediate failure or data corruption** in production.

---

### C-1: Missing `vercel.json` — All direct URL navigation returns 404

| Field | Detail |
|-------|--------|
| **File** | `frontend/vercel.json` (does not exist) |
| **Severity** | CRITICAL — Deployment blocker |
| **Impact** | Any user navigating directly to `/browse`, `/product/123`, `/login`, `/seller/dashboard`, etc. or refreshing the page will receive a 404 from Vercel. Only `/` works. The entire app is functionally broken for any shared link or bookmarked URL. |

**Fix:** Create `frontend/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
**Effort:** 2 minutes

---

### C-2: Unvalidated `category_id` in `getFeaturedProducts` — SQL injection surface

| Field | Detail |
|-------|--------|
| **File** | `backend/src/routes/promotion.routes.js:25`, `backend/src/controllers/promotion.controller.js` (getFeaturedProducts handler) |
| **Severity** | CRITICAL — Security vulnerability |
| **Impact** | The `category_id` query parameter passed to `getFeaturedProducts` has no Zod validation middleware on the route. Any value (malformed UUID, SQL fragment, empty string) passes directly to the service layer and then to Supabase queries. While Supabase uses parameterized queries that prevent classical SQL injection, an invalid UUID causes a Postgres error that leaks internal schema details in non-production and triggers unhandled error paths in production. |

**Fix:** Add validation middleware to the route:
```js
// backend/src/routes/promotion.routes.js
import { validateQuery } from '../middlewares/validate.middleware.js';
import { z } from 'zod';

const featuredQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

router.get('/featured-products',
  validateQuery(featuredQuerySchema),
  promotionController.getFeaturedProducts
);
```
**Effort:** 15 minutes

---

### C-3: Hardcoded English strings in `formatPrice.js` — broken for Arabic/French users

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/utils/formatPrice.js:30`, `frontend/src/utils/formatPrice.js:49` |
| **Severity** | CRITICAL — Core UX broken for 100% of Arabic users (default language) |
| **Impact** | Arabic is the default language. `formatPriceRange()` (line 30) and `formatProductPrice()` (line 49) both hardcode `"From"` in English. Every product with a price range (i.e., any product without a fixed price) displays "From 1500 DA" in English on the homepage, browse page, and product cards — visually breaking the Arabic UI for all default-language users. |

**Fix:** Pass the translation function `t` through both utility calls, or use a constant from i18n:
```js
// Option A: Thread `t` through (preferred)
export function formatPriceRange(min, max, currency = 'DA', t) {
  if (min === max) return formatPrice(min, currency);
  return t ? `${t('common.from')} ${formatPrice(min, currency)}` : `From ${formatPrice(min, currency)}`;
}

// Also update all call sites to pass `t` from useTranslation()
```
Add to both locale files:
```json
// en.json and ar.json: under "common"
"from": "From"        // en
"from": "ابتداءً من"  // ar
```
**Effort:** 30 minutes

---

## 🟡 HIGH — Should Fix Before Deployment

These issues cause **significant bugs, security gaps, or bad UX** but don't make the app completely non-functional.

---

### H-1: No product existence check in promotion service — seller can promote any product_id

| Field | Detail |
|-------|--------|
| **File** | `backend/src/services/promotion.service.js` (requestPromotion handler) |
| **Severity** | HIGH — Business logic integrity |
| **Impact** | When a seller requests a product-level promotion, the service does not verify that the `product_id` exists and belongs to the requesting seller before creating the promotion record. A seller could submit any arbitrary UUID as a product_id and create promotions referencing non-existent or other sellers' products. |

**Fix:**
```js
// In requestPromotion(), before creating the record:
const { data: product, error } = await supabase
  .from('products')
  .select('id, seller_id')
  .eq('id', product_id)
  .single();

if (error || !product) throw new AppError('Product not found', 404);
if (product.seller_id !== sellerId) throw new AppError('Forbidden', 403);
```
**Effort:** 20 minutes

---

### H-2: `review.controller.js` — missing `req.validated.params` guard on review update/delete

| Field | Detail |
|-------|--------|
| **File** | `backend/src/controllers/review.controller.js:74-76` |
| **Severity** | HIGH — Runtime error in production |
| **Impact** | If the validation middleware is bypassed or the `review_id` param fails to validate, `req.validated.params` will be undefined and `req.validated.params.review_id` throws an unhandled TypeError that bypasses the error handler, returning a 500 with stack trace details in development. |

**Fix:**
```js
const { review_id } = req.validated?.params ?? req.params;
```
**Effort:** 5 minutes

---

### H-3: Upload endpoint has no per-user rate limiting — abuse vector

| Field | Detail |
|-------|--------|
| **File** | `backend/src/routes/upload.routes.js` |
| **Severity** | HIGH — Resource abuse / DoS vector |
| **Impact** | The upload endpoint (`POST /uploads/image`) is covered only by the global rate limiter (100 req/15min across ALL users). A single malicious user can hammer uploads, filling Supabase storage and consuming the entire rate limit budget for all other users on the platform simultaneously. |

**Fix:**
```js
import rateLimit from 'express-rate-limit';

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many uploads, please try again later.' },
});

router.post('/image', authenticate, uploadLimiter, upload.single('image'), uploadController.uploadImage);
```
**Effort:** 10 minutes

---

### H-4: `api.js:10` — API base URL falls back to localhost in production build

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/services/api.js:10` |
| **Severity** | HIGH — Silent production failure |
| **Impact** | `const BASE_URL = import.meta.env.VITE_API_URL \|\| 'http://localhost:5000/api';` — If `VITE_API_URL` is not set in the Vercel environment variables (easy to forget), ALL API calls in production silently hit `http://localhost:5000` (which doesn't exist), returning network errors with no useful error message to the user. The app appears broken with no indication why. |

**Fix:**
```js
const BASE_URL = import.meta.env.VITE_API_URL;
if (!BASE_URL) {
  throw new Error('VITE_API_URL environment variable is required');
}
```
Or at minimum fail loudly during build:
```js
// vite.config.js
if (!process.env.VITE_API_URL && process.env.NODE_ENV === 'production') {
  throw new Error('VITE_API_URL must be set for production builds');
}
```
**Effort:** 10 minutes

---

### H-5: Duplicate `NotificationsPage` files — router imports wrong one

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/pages/NotificationsPage.jsx` AND `frontend/src/pages/client/NotificationsPage.jsx` |
| **Severity** | HIGH — Code maintenance / potential runtime mismatch |
| **Impact** | Two files exist for the same page. The router imports from `pages/NotificationsPage` (root level). If future edits happen to the `pages/client/` version (the logical location), the router will silently continue using the stale root-level file. This has already caused confusion and will cause divergence. |

**Fix:** Delete the unused file. Verify which is canonical (likely the more complete one), update the router import to the canonical path, delete the other.
```
rm frontend/src/pages/client/NotificationsPage.jsx
# or
rm frontend/src/pages/NotificationsPage.jsx
# (keep the one with more complete implementation)
```
**Effort:** 10 minutes

---

### H-6: French `fr.json` is only ~46% complete — language switcher shows untranslated keys

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/i18n/locales/fr.json` |
| **Severity** | HIGH — Broken UX for French users |
| **Impact** | If a user switches to French, roughly 54% of the UI displays raw i18n keys (e.g., `orders.seller.acceptBtn`) instead of text. This makes the French language option actively harmful — worse than having no French at all. |

**Fix (two options):**
1. Complete `fr.json` to 100% parity with `en.json` (preferred)
2. Remove French from the language switcher options until complete:
```jsx
// frontend/src/components/layout/LanguageSwitcher.jsx
const AVAILABLE_LANGUAGES = ['ar', 'en']; // remove 'fr' until complete
```
**Effort:** Option 1: 4-6 hours | Option 2: 5 minutes

---

### H-7: `backend/package.json` has no `engines` field — Render may use wrong Node version

| Field | Detail |
|-------|--------|
| **File** | `backend/package.json` |
| **Severity** | HIGH — Deployment risk |
| **Impact** | Render.com will use its default Node version if no `engines` field is specified. If the default differs from the development version, runtime differences in behavior (especially with Express v5 alpha, crypto APIs, and Supabase client) can cause silent failures or startup crashes. |

**Fix:**
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```
**Effort:** 2 minutes

---

### H-8: `product.service.js` — loads ALL verified sellers for product filtering (N+1 / memory risk)

| Field | Detail |
|-------|--------|
| **File** | `backend/src/services/product.service.js:378-392` |
| **Severity** | HIGH — Performance / scalability |
| **Impact** | The product browse/filter logic loads the full list of verified sellers into memory before filtering products. At scale (100+ sellers), this loads thousands of records to filter by a single seller attribute. As seller count grows, this query becomes increasingly expensive and will eventually cause timeouts on Render's free tier (512MB RAM). |

**Fix:** Push the `is_verified` filter into the Supabase query join instead of post-filtering in JS:
```js
// Instead of fetching all sellers then filtering:
query = query.eq('sellers.is_verified', true); // join-level filter
```
**Effort:** 30 minutes

---

## 🟢 MEDIUM — Fix When Possible

These issues cause **degraded UX, minor bugs, or technical debt** that should be resolved before or shortly after launch.

---

### M-1: `order.status.ready` missing from both `en.json` and `ar.json`

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/i18n/locales/en.json`, `frontend/src/i18n/locales/ar.json` |
| **Severity** | MEDIUM — UI displays raw key for ready orders |
| **Impact** | When an order is in `ready` status, `t('order.status.ready')` returns the literal string `"order.status.ready"` in the UI. The key exists under `orders.statuses.ready` but NOT under `order.status.ready`. Any component using the short-form key path shows a broken label. |

**Fix:** Add to both locale files under `order.status`:
```json
// en.json
"order": { "status": { "ready": "Ready to Confirm", ... } }

// ar.json
"order": { "status": { "ready": "جاهز للتأكيد", ... } }
```
**Effort:** 5 minutes

---

### M-2: `formatDeadline()` — "Overdue", "Today", "Tomorrow" hardcoded in English

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/utils/formatPrice.js:135-138` |
| **Severity** | MEDIUM — Untranslated text in deadline displays |
| **Impact** | Order deadline badges display "Overdue", "Today", "Tomorrow" in English regardless of UI language. Arabic users see English date labels in their native-language interface. |

**Fix:** Thread `t` parameter through `formatDeadline(date, t)` and add keys:
```json
"deadline": {
  "overdue": "متأخر",
  "today": "اليوم",
  "tomorrow": "غداً"
}
```
**Effort:** 20 minutes

---

### M-3: Deprecated locale directory `src/locales/` still exists alongside active `src/i18n/locales/`

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/locales/` (directory) |
| **Severity** | MEDIUM — Confusion and maintenance risk |
| **Impact** | Two locale directories exist. The active one is `src/i18n/locales/`. The deprecated `src/locales/` is no longer imported anywhere but confuses contributors who may edit the wrong files. Any changes made to files in `src/locales/` will have zero effect. |

**Fix:** Delete the deprecated directory:
```
rm -rf frontend/src/locales/
```
Verify no imports reference it first:
```
grep -r "src/locales" frontend/src/
```
**Effort:** 5 minutes

---

### M-4: Two i18n implementations coexist — `index.jsx` (active) and `index.js` (deprecated custom hook)

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/i18n/index.js` (deprecated), `frontend/src/i18n/index.jsx` (active) |
| **Severity** | MEDIUM — Dead code / confusion |
| **Impact** | `index.js` is a custom hand-rolled translation hook that predates the React-i18next migration. It is no longer imported anywhere. However, its presence creates confusion about which system is authoritative and increases bundle risk if a contributor accidentally imports it. |

**Fix:** Delete `frontend/src/i18n/index.js`. Verify with:
```
grep -r "i18n/index.js" frontend/src/
```
**Effort:** 2 minutes

---

### M-5: `auth.service.js:162-200` — Overly complex duplicate registration fallback path

| Field | Detail |
|-------|--------|
| **File** | `backend/src/services/auth.service.js:162-200` |
| **Severity** | MEDIUM — Code complexity / hidden bug risk |
| **Impact** | The registration function has a multi-branch fallback that attempts to handle "user already exists in Supabase Auth but not in our users table" as a recovery path. This dual-registration pattern is difficult to reason about and may create inconsistent user states (e.g., user exists in Supabase Auth but their `users` row has mismatched data). The fallback has never been tested in production. |

**Fix:** Simplify to a single registration path. If the user already exists in Auth but not in `users`, treat it as a conflict (409) and require them to log in or contact support — do not silently create a partial record.
**Effort:** 1-2 hours

---

### M-6: `ErrorBoundary` logs unredacted stack traces to browser console in production

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/components/ErrorBoundary.jsx` |
| **Severity** | MEDIUM — Information disclosure |
| **Impact** | `console.error(error, errorInfo)` logs full component stack traces in the browser console unconditionally, including in production. Exposes internal component names, file paths, and state to anyone who opens DevTools. |

**Fix:**
```jsx
componentDidCatch(error, errorInfo) {
  if (import.meta.env.DEV) {
    console.error(error, errorInfo);
  }
  // In production, send to error tracking service (Sentry, etc.)
}
```
**Effort:** 5 minutes

---

### M-7: `.env.example` has empty values — no guidance for new developers

| Field | Detail |
|-------|--------|
| **File** | `backend/.env.example` |
| **Severity** | MEDIUM — Developer experience |
| **Impact** | All values in `.env.example` are empty (e.g., `SUPABASE_URL=`). A new developer has no indication of required format, which values are optional vs required, or example values. This causes misconfigured deployments. |

**Fix:** Fill in example formats:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
JWT_SECRET=minimum-32-character-random-secret-here
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
AUTH_OTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
GEMINI_API_KEY=AIza...
```
**Effort:** 10 minutes

---

### M-8: Notification body text hardcoded in Arabic in backend services

| Field | Detail |
|-------|--------|
| **File** | `backend/src/services/order.service.js`, `backend/src/services/notification.service.js` |
| **Severity** | MEDIUM — Architectural inconsistency (acceptable for MVP if documented) |
| **Impact** | Notification body strings like `"تم قبول طلبك"` are hardcoded in Arabic in the backend. The original architecture intends for the frontend to translate by notification `type` — but if the frontend displays `body` directly (as a fallback), French/English users see Arabic text. Notification `type` codes are the correct translation key. |

**Fix:** Ensure all frontend notification rendering uses `t(`notifications.types.${notification.type}`)` and never renders `notification.body` directly. Document this convention explicitly. Alternatively, store the type key (not translated text) in the body column.
**Effort:** 30 minutes

---

### M-9: `clientRating.controller.js` — missing query parameter defaults

| Field | Detail |
|-------|--------|
| **File** | `backend/src/controllers/clientRating.controller.js:28` |
| **Severity** | MEDIUM — Runtime error on missing params |
| **Impact** | Query parameters like `page` and `limit` are accessed without defaults. If omitted, `parseInt(undefined)` returns `NaN`, which then propagates to the Supabase `.range()` call and causes a 500 error. |

**Fix:**
```js
const page = parseInt(req.query.page ?? '1', 10);
const limit = parseInt(req.query.limit ?? '10', 10);
```
**Effort:** 5 minutes

---

## ⚪ LOW — Future Improvements

These are polish, code quality, and minor inconsistency issues. Safe to address post-launch.

---

### L-1: `language.english` shows "English" in `ar.json` — not translated to Arabic

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/i18n/locales/ar.json` |
| **Problem** | The language selector label for English (`language.english`) shows "English" instead of "الإنجليزية" in the Arabic locale. |
| **Fix** | `"english": "الإنجليزية"` in `ar.json` |
| **Effort** | 1 minute |

---

### L-2: `admin.controller.js` — missing `req.validated` guards on several endpoints

| Field | Detail |
|-------|--------|
| **File** | `backend/src/controllers/admin.controller.js` |
| **Problem** | Several admin controller methods access `req.validated.body` or `req.validated.params` without null-checking. If validation middleware is absent from a route (e.g., if a route is added without a validate middleware), these dereferences throw uncaught TypeErrors. |
| **Fix** | Add optional chaining: `req.validated?.body ?? req.body` |
| **Effort** | 15 minutes |

---

### L-3: Duplicate i18n sections `sellerOrders.*` and `orders.seller.*` cover the same content

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/i18n/locales/en.json`, `frontend/src/i18n/locales/ar.json` |
| **Problem** | Two parallel translation sections exist for seller-side order management: `sellerOrders` and `orders.seller`. Components reference one or the other inconsistently. Maintaining two copies creates drift. |
| **Fix** | Audit which key path is actually used in components, delete the unused section from both locale files. |
| **Effort** | 30 minutes |

---

### L-4: `categories.sweets` exists in locale files but is not a real category

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/i18n/locales/en.json`, `frontend/src/i18n/locales/ar.json` |
| **Problem** | Both locale files contain `categories.sweets` translation keys, but "sweets" is not a category defined in `CONTEXT.md`. This orphaned key implies a category that was planned but never added to the database seed. |
| **Fix** | Either add the category to the database seed or remove the key from both locale files. |
| **Effort** | 5 minutes |

---

### L-5: `React.StrictMode` disabled in `main.jsx`

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/main.jsx` |
| **Problem** | StrictMode intentionally highlights potential problems by double-invoking lifecycle methods and render functions in development. Disabling it removes this safety net and may hide subtle bugs. |
| **Fix** | Re-enable: `<React.StrictMode><App /></React.StrictMode>` (resolve any double-invoke issues rather than disabling StrictMode). |
| **Effort** | Variable — depends on what bugs it exposes |

---

### L-6: Backend logger uses `warn` level in production — suppresses `info` logs

| Field | Detail |
|-------|--------|
| **File** | `backend/src/utils/logger.js` |
| **Problem** | The production log level is set to `warn`, which means all `logger.info(...)` calls (startup messages, request logging, health checks) are silently dropped in production. This makes debugging production issues significantly harder. |
| **Fix** | Change production log level to `info`. Use `error` level only if log volume is a concern. |
| **Effort** | 2 minutes |

---

### L-7: `OrderStatusBadge.jsx` is an empty stub

| Field | Detail |
|-------|--------|
| **File** | `frontend/src/components/order/OrderStatusBadge.jsx` |
| **Problem** | The file contains only a single line stub. Status badge rendering is currently handled inline in multiple components. This creates code duplication and inconsistent status color mapping. |
| **Fix** | Implement the component:
```jsx
const STATUS_STYLES = {
  pending:   'bg-amber-100 text-amber-700',
  accepted:  'bg-blue-100 text-blue-700',
  rejected:  'bg-red-100 text-red-700',
  ready:     'bg-sage-100 text-sage-700',
  completed: 'bg-green-100 text-green-700',
};

export default function OrderStatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`badge ${STATUS_STYLES[status] ?? 'bg-warm-100 text-warm-600'}`}>
      {t(`order.status.${status}`, status)}
    </span>
  );
}
```
**Effort:** 20 minutes |

---

## Summary Table

| ID | Severity | File | Issue | Effort |
|----|----------|------|-------|--------|
| C-1 | 🔴 CRITICAL | `frontend/vercel.json` | Missing SPA routing config — all direct URLs 404 | 2 min |
| C-2 | 🔴 CRITICAL | `backend/src/routes/promotion.routes.js:25` | Unvalidated `category_id` query param | 15 min |
| C-3 | 🔴 CRITICAL | `frontend/src/utils/formatPrice.js:30,49` | Hardcoded English "From" for Arabic users | 30 min |
| H-1 | 🟡 HIGH | `backend/src/services/promotion.service.js` | No product ownership check in promotion requests | 20 min |
| H-2 | 🟡 HIGH | `backend/src/controllers/review.controller.js:74-76` | Missing `req.validated.params` guard | 5 min |
| H-3 | 🟡 HIGH | `backend/src/routes/upload.routes.js` | No per-user rate limit on upload endpoint | 10 min |
| H-4 | 🟡 HIGH | `frontend/src/services/api.js:10` | API URL falls back to localhost in production | 10 min |
| H-5 | 🟡 HIGH | `frontend/src/pages/NotificationsPage.jsx` (×2) | Duplicate page file — wrong one may be used | 10 min |
| H-6 | 🟡 HIGH | `frontend/src/i18n/locales/fr.json` | French locale only 46% complete | 5 min† |
| H-7 | 🟡 HIGH | `backend/package.json` | No `engines` field — wrong Node version on Render | 2 min |
| H-8 | 🟡 HIGH | `backend/src/services/product.service.js:378-392` | All sellers loaded into memory for filtering | 30 min |
| M-1 | 🟢 MEDIUM | `frontend/src/i18n/locales/en.json`, `ar.json` | `order.status.ready` key missing | 5 min |
| M-2 | 🟢 MEDIUM | `frontend/src/utils/formatPrice.js:135-138` | Deadline labels hardcoded in English | 20 min |
| M-3 | 🟢 MEDIUM | `frontend/src/locales/` | Deprecated locale dir still on disk | 5 min |
| M-4 | 🟢 MEDIUM | `frontend/src/i18n/index.js` | Deprecated custom i18n hook still on disk | 2 min |
| M-5 | 🟢 MEDIUM | `backend/src/services/auth.service.js:162-200` | Complex duplicate registration fallback | 2 hrs |
| M-6 | 🟢 MEDIUM | `frontend/src/components/ErrorBoundary.jsx` | Stack traces logged to console in production | 5 min |
| M-7 | 🟢 MEDIUM | `backend/.env.example` | All values empty — no format guidance | 10 min |
| M-8 | 🟢 MEDIUM | `backend/src/services/order.service.js` | Notification body hardcoded in Arabic | 30 min |
| M-9 | 🟢 MEDIUM | `backend/src/controllers/clientRating.controller.js:28` | Missing defaults for `page`/`limit` query params | 5 min |
| L-1 | ⚪ LOW | `frontend/src/i18n/locales/ar.json` | `language.english` not translated to Arabic | 1 min |
| L-2 | ⚪ LOW | `backend/src/controllers/admin.controller.js` | Missing `req.validated` guards | 15 min |
| L-3 | ⚪ LOW | `frontend/src/i18n/locales/` | Duplicate `sellerOrders` + `orders.seller` sections | 30 min |
| L-4 | ⚪ LOW | `frontend/src/i18n/locales/` | `categories.sweets` key not a real category | 5 min |
| L-5 | ⚪ LOW | `frontend/src/main.jsx` | React.StrictMode disabled | variable |
| L-6 | ⚪ LOW | `backend/src/utils/logger.js` | Production log level `warn` hides `info` logs | 2 min |
| L-7 | ⚪ LOW | `frontend/src/components/order/OrderStatusBadge.jsx` | Empty stub component | 20 min |

† For H-6: the "5 min" fix is removing French from the language switcher. Full completion is 4-6 hours.

---

## Deployment Checklist (Minimum Viable)

Before going live, confirm:

- [ ] C-1: `frontend/vercel.json` created with SPA rewrite rule
- [ ] C-3: `formatPrice.js` "From" string uses i18n
- [ ] H-4: `VITE_API_URL` set in Vercel environment variables
- [ ] H-6: French removed from language switcher OR completed
- [ ] H-7: `engines` field added to `backend/package.json`
- [ ] All environment variables set on Render (backend) and Vercel (frontend)
- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` confirmed valid
- [ ] `CLIENT_URL` in backend env matches actual Vercel domain (not localhost)
- [ ] `NODE_ENV=production` set on Render
- [ ] CORS origin updated to match production Vercel URL
- [ ] SMTP credentials tested (OTP emails must work)

---

*Generated by 8-phase forensic audit of Hirftna Marketplace codebase — 2026-05-19*
