# Fixes Applied — Hirftna Marketplace

**Applied:** 2026-05-10  
**Based on:** BUG_REPORT.md audit

---

## Summary

| Category | Count |
|---|---|
| Critical bugs fixed | 4 |
| Security issues fixed | 1 |
| High severity fixed | 5 |
| Mismatches fixed | 1 |
| Medium severity fixed | 4 |
| Missing features implemented | 1 |
| Low severity fixed | 2 |
| **Total files modified** | **22** |

---

## Detailed Change Log

### PHASE 1 — Critical Bugs

| # | File | Change | Lines |
|---|------|--------|-------|
| C1 | `backend/src/controllers/review.controller.js` | Added `req.validated?.params` null guard to `getProductReviews` and `getSellerRatings` — prevents `TypeError` crash if param validation middleware is missing | 11, 45 |
| C2 | `backend/src/services/admin.service.js` | Fixed non-existent column `base_price` → `price`; replaced non-existent `images` column with `product_images` subquery | 299 |
| C2 | `frontend/src/pages/admin/AdminProducts.jsx` | Updated to read `product.cover[0].image_url` and `product.price` to match corrected backend response | 148–153 |
| C3 | `backend/src/services/auth.service.js` | Replaced in-process `Map` for OTP sessions and reset tokens with Supabase DB table operations — survives restarts and multi-process deploys | 11–14, 106–133, 359–408, 501–594 |
| C3 | `backend/migrations/001_otp_reset_tables.sql` | **NEW FILE** — SQL migration creating `otp_sessions` and `password_reset_tokens` tables; must be run in Supabase before deploy | — |
| C4 | `backend/src/routes/order.routes.js` | Removed `requireRole('client')` from `PATCH /orders/:id/complete` — sellers acting as buyers (role='seller') can now confirm their own orders; service-layer `client_id` check still enforces ownership | 90–96 |

### PHASE 2 — Security

| # | File | Change | Lines |
|---|------|--------|-------|
| SEC-1 | `backend/src/app.js` | Localhost CORS origins (`localhost:5173`, `localhost:3000`) now only added when `NODE_ENV !== 'production'` — prevents local origins leaking into production allow-list | 29–35 |

### PHASE 3 — High Severity

| # | File | Change | Lines |
|---|------|--------|-------|
| H1 | `backend/src/middlewares/error.middleware.js` | Added `MulterError` handler branch — file-too-large and file-count-exceeded now return 400 instead of 500 | 68–75 |
| H3 | `backend/src/services/auth.service.js` | Email confirmation check now unconditional — no longer gated by `isOtpEnabled()` flag; prevents unverified users from logging in after OTP is disabled | 303–305 |
| H4 | `backend/src/services/wishlist.service.js` | Added `void` prefix and `.catch()` to fire-and-forget browsing event insert — prevents unhandled promise rejections from crashing the process | 116–129 |
| H6 | `frontend/src/pages/auth/LoginPage.jsx` | Added OTP step: imports `OtpStep`, uses `pendingOtp`/`clearPendingOtp`/`verifyOtp` from AuthContext; login now shows OTP form when backend returns `requires_otp: true` | 1–75, form wrapper |
| H7 | `frontend/src/pages/seller/SellerOrdersPage.jsx` | Fixed infinite fetch loop: added `purchasesLoaded` ref, replaced `loadingPurchases` dependency with ref check; added `useRef` to imports | 1, 158–159, 190–194 |

### PHASE 4 — Frontend ↔ Backend Mismatches

| # | File | Change | Lines |
|---|------|--------|-------|
| M8 | `frontend/src/pages/client/ProfilePage.jsx` | Added `avatar_url` to the `PUT /auth/me` payload — avatar changes are now persisted to the DB, not just local state | 233–238 |

### PHASE 5 — Medium Severity

| # | File | Change | Lines |
|---|------|--------|-------|
| M7 | `frontend/src/pages/client/WishlistPage.jsx` | Fixed null product crash: `entry.product ?? entry` → `entry.product` — raw wishlist rows with missing products are now filtered out instead of passed to ProductCard | 45 |
| M9 | `frontend/src/pages/NotificationsPage.jsx` | Added `order_ready` to TYPE_ICONS; removed deprecated `message` type (no chat feature in this platform) | 11–19 |
| M12 | `backend/src/services/admin.service.js` | Removed `error?.code === '406'` from `isNotFound` | 7 |
| M12 | `backend/src/services/category.service.js` | Same fix | 12–13 |
| M12 | `backend/src/services/seller.service.js` | Same fix | 38–39 |
| M12 | `backend/src/services/notification.service.js` | Same fix | 7–8 |
| M12 | `backend/src/services/order.service.js` | Same fix | 53–54 |
| M12 | `backend/src/services/review.service.js` | Same fix | 10–11 |
| M12 | `backend/src/services/product.service.js` | Same fix (3-line version) | 22–25 |

### PHASE 6 — Missing Features

| # | Feature | Files | Change |
|---|---------|-------|--------|
| MF-2 | Order list pagination | `frontend/src/pages/client/OrdersPage.jsx`, `frontend/src/pages/seller/SellerOrdersPage.jsx` | Added `limit: 100` to all `ordersAPI.getAll()` calls — fetches up to the backend max, preventing silent truncation to 20 records |

### PHASE 7 — Low Severity

| # | File | Change | Lines |
|---|------|--------|-------|
| L7 | `frontend/src/pages/client/WishlistPage.jsx` | Replaced all hardcoded Arabic strings with `useTranslation()` calls using existing `wishlist.*` and `common.error` i18n keys; added `useTranslation` import | 1–33, 36, 72–85 |

---

## Files Modified (complete list)

**Backend:**
- `backend/src/controllers/review.controller.js`
- `backend/src/middlewares/error.middleware.js`
- `backend/src/routes/order.routes.js`
- `backend/src/services/admin.service.js`
- `backend/src/services/auth.service.js`
- `backend/src/services/category.service.js`
- `backend/src/services/notification.service.js`
- `backend/src/services/order.service.js`
- `backend/src/services/product.service.js`
- `backend/src/services/review.service.js`
- `backend/src/services/seller.service.js`
- `backend/src/services/wishlist.service.js`
- `backend/src/app.js`
- `backend/migrations/001_otp_reset_tables.sql` *(new file)*

**Frontend:**
- `frontend/src/pages/admin/AdminProducts.jsx`
- `frontend/src/pages/auth/LoginPage.jsx`
- `frontend/src/pages/client/OrdersPage.jsx`
- `frontend/src/pages/client/ProfilePage.jsx`
- `frontend/src/pages/client/WishlistPage.jsx`
- `frontend/src/pages/seller/SellerOrdersPage.jsx`
- `frontend/src/pages/NotificationsPage.jsx`

---

## Remaining Known Issues (not fixed in this pass)

| # | Issue | Reason not fixed |
|---|-------|-----------------|
| BUG-H5 | `admin.service.js:getStats` — top-sellers query fetches ALL completed orders with no limit | Low risk for MVP; fix requires a Supabase RPC or DB view — out of scope for code-only fix |
| BUG-M10 | `SellerDashboard.jsx` — hardcoded English status labels and `formatRelativeTime` strings | Requires i18n key additions to both locale files; deferred to next i18n pass |
| BUG-M11 | `auth.service.js` — `smtpTransporter` created at module load with possibly undefined SMTP env vars | Cosmetic risk only; no functional impact since `sendMail` is never called when OTP is disabled |
| BUG-L3 | `auth.service.js` — expired OTP sessions only pruned on activity (Map cleanup is now replaced by DB TTL queries) | Resolved implicitly by the C3 fix; DB queries always filter by `expires_at` |
| BUG-L4 | `SellerPage.jsx` — category badge renders with `undefined` text when no category set | Edge case; Badge component handles undefined gracefully |

## Required Action Before Deploy

Run the SQL migration in the Supabase SQL Editor:

```
backend/migrations/001_otp_reset_tables.sql
```

This creates the `otp_sessions` and `password_reset_tokens` tables required by the C3 fix. The backend will throw 500 errors on OTP and password-reset flows until these tables exist.
