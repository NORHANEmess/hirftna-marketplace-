# HIRFTNA MARKETPLACE — Technical Analysis Report
# Prepared for: Mémoire de Fin d'Études (End-of-Studies Thesis)
# Date: 2026-05-07
# Analyst: Generated via automated multi-pass codebase review

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Project Statistics](#2-project-statistics)
3. [Architecture Overview](#3-architecture-overview)
4. [Feature-by-Feature Analysis](#4-feature-by-feature-analysis)
5. [Security Audit](#5-security-audit)
6. [Bug Report](#6-bug-report)
7. [Code Quality Assessment](#7-code-quality-assessment)
8. [Frontend–Backend Alignment](#8-frontendbackend-alignment)
9. [Performance Observations](#9-performance-observations)
10. [Technical Debt Inventory](#10-technical-debt-inventory)
11. [Compliance Check](#11-compliance-check)
12. [Recommendations](#12-recommendations)

---

## 1. Executive Summary

Hirftna Marketplace is a full-stack web application designed to connect Algerian artisans with clients through a structured custom-order system. The platform intentionally removes direct messaging in favour of a well-defined, state-machine-driven order lifecycle. The backend is a Node.js/Express v5 API backed by Supabase (PostgreSQL), and the frontend is a React 18/Vite single-page application with TailwindCSS and i18next internationalisation supporting both Arabic (RTL) and English.

The overall architecture is sound and follows established industry patterns: strict MVC separation on the backend, a consistent validation layer (Zod v4), standardised API responses, RBAC middleware, and a single-source-of-truth API module on the frontend. The codebase is notably mature for an academic project: it includes rate limiting, magic-byte file validation, a timing-safe OTP comparison, Winston structured logging with redaction, and a shared schema layer between frontend and backend.

The principal technical risks are (a) in-memory storage of OTP sessions and password-reset tokens — which would silently fail in a multi-instance deployment or after a process restart — and (b) a product review submission path on `ProductPage.jsx` that omits a required `order_id` field and will return HTTP 400 on every attempt. Both issues are straightforward to fix. Additional medium-priority findings relate to the upload MIME-type check relying on the client-supplied header rather than magic-byte detection, JWT tokens stored in `localStorage`, and one missing role guard at the route level on the `/orders/:id/complete` endpoint.

Overall maturity: **High for an academic MVP**. The codebase is readable, consistently structured, and demonstrates knowledge of real-world security and operational concerns that go beyond typical coursework projects.

---

## 2. Project Statistics

### File Counts

| Category | Count |
|---|---|
| Backend source files (`.js`) | ~38 |
| Frontend pages (`.jsx`) | 23 |
| Frontend components (`.jsx`) | 23 |
| i18n locale files | 2 (AR + EN) |
| Shared schema files | 2 |
| Configuration files (`.env`, `tailwind`, `vite`, `postcss`) | 6 |

### Approximate Line Counts

| Directory | Approx. Lines |
|---|---|
| `backend/src/services/` | ~2 100 |
| `backend/src/controllers/` | ~600 |
| `backend/src/routes/` | ~580 |
| `backend/src/middlewares/` | ~630 |
| `backend/src/validators/` | ~280 |
| `backend/src/config/` | ~315 |
| `backend/src/utils/` | ~245 |
| `frontend/src/pages/` | ~4 400 |
| `frontend/src/components/` | ~3 100 |
| `frontend/src/services/api.js` | 473 |
| `frontend/src/context/` | ~270 |
| **Total (estimated)** | **~13 000** |

### Dependency Counts

| Category | Count |
|---|---|
| Backend runtime dependencies | 17 |
| Backend dev dependencies | 1 |
| Frontend runtime dependencies | 10 |
| Frontend build/dev tools | 5 |

### API Surface

| Metric | Count |
|---|---|
| Backend route handlers | ~57 |
| Frontend API function definitions | 56 |
| i18n keys (EN locale) | ~180 |
| Database tables | 16 (1 removed/reserved) |
| Supabase DB triggers | 4 |

---

## 3. Architecture Overview

### 3.1 Layer Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                                │
│  React 18 + Vite (port 5173)                                        │
│  ┌────────────┐  ┌───────────────┐  ┌──────────────┐               │
│  │ React Router│  │ AuthContext   │  │ i18next      │               │
│  │ (v7 / v6)  │  │ (JWT + user)  │  │ (AR/EN RTL)  │               │
│  └────────────┘  └───────────────┘  └──────────────┘               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ api.js — Axios instance (baseURL /api/v1, JWT interceptors)  │    │
│  │  authAPI · productsAPI · ordersAPI · reviewsAPI · wishlistAPI │    │
│  │  sellersAPI · categoriesAPI · notificationsAPI · uploadsAPI   │    │
│  │  clientRatingsAPI · chatbotAPI · adminAPI                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────────────────┘
                       │ HTTP/HTTPS · Authorization: Bearer <JWT>
┌──────────────────────▼───────────────────────────────────────────────┐
│                   EXPRESS v5 API SERVER (port 4000)                  │
│                                                                      │
│  app.js — Global Middleware Stack (in execution order):              │
│  helmet → cors → hpp → compression → express.json → morgan           │
│  → globalLimiter → routeSpecificLimiters → authenticate              │
│  → requireRole → validate → controller → errorHandler               │
│                                                                      │
│  Route Modules:                                                      │
│  /auth · /products · /orders · /sellers · /categories               │
│  /reviews · /client-ratings · /wishlist · /notifications             │
│  /uploads · /chatbot · /admin · /users                               │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │          Service Layer (business logic + DB access)       │       │
│  │  auth · order · product · seller · review · wishlist      │       │
│  │  clientRating · chatbot · admin · notification · upload   │       │
│  └────────────────────────┬─────────────────────────────────┘       │
└───────────────────────────┼──────────────────────────────────────────┘
                            │ @supabase/supabase-js (service-role key)
┌───────────────────────────▼──────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL 15)                          │
│  Tables: users · sellers · products · product_images · orders       │
│  order_items · reviews · ratings · client_ratings · wishlist        │
│  notifications · subscriptions · promotions · browsing_events       │
│  Triggers: on_auth_user_created · trg_product_avg_rating            │
│            trg_seller_avg_rating · trg_seller_subscription           │
│  Storage buckets: product-images (public) · avatars (public)        │
└──────────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│               EXTERNAL SERVICES                                      │
│  Google Gemini 1.5 Flash — AI chatbot proxy                         │
│  nodemailer + SMTP — OTP emails + password-reset emails             │
│  Chargily (planned) — Algerian payment gateway (frontend-only MVP)  │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack Summary

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Frontend framework | React | 19.2.4 | Latest stable; StrictMode disabled |
| Frontend build | Vite | latest | Fast HMR |
| Styling | TailwindCSS | latest | Custom cream/beige/sage design system |
| Routing | React Router | 7.14.0 | File imported as v6 API (`createBrowserRouter`) |
| i18n | i18next + react-i18next | 26 / 17 | AR + EN, RTL auto-switch |
| HTTP client | Axios | 1.15.0 | Token interceptors, refresh queue |
| Backend framework | Express | 5.2.1 | First stable v5 release |
| Validation | Zod | 4.3.6 | Same version on both sides |
| Database | Supabase (PostgreSQL 15) | JS SDK 2.99 | supabaseAdmin bypasses RLS |
| Auth | Supabase Auth + JWT | — | JWT verified server-side |
| Logging | Winston | 3.19.0 | File + console, sensitive-field redaction |
| AI | Gemini 1.5 Flash | SDK 0.24.1 | Backend proxy; history mapping |
| Email | nodemailer | 8.0.7 | SMTP transport |
| File upload | multer + sharp + file-type | 2.1.1 / 0.34.5 / 22.0.0 | Image resize before Supabase upload |

### 3.3 Data Flow Description

Every request follows a deterministic path:

```
Browser → Axios (attaches JWT Bearer) → Express global middleware
→ Route-specific rate limiter (if any) → authenticate middleware
  (verifies JWT with Supabase, loads user + seller rows from DB)
→ requireRole (checks user.role from DB against allowed roles)
→ validate (runs Zod schema, writes to req.validated.{body/params/query})
→ asyncHandler(controller) (calls service, calls sendSuccess/sendError)
→ service (Supabase queries via supabaseAdmin)
→ Supabase PostgreSQL
→ service returns data
→ controller returns standardised JSON
→ errorHandler (catches any thrown AppError or generic Error)
→ Browser receives { success, message, data }
```

### 3.4 Design Patterns Used

| Pattern | Where Applied |
|---|---|
| **MVC (Model-View-Controller)** | `routes/` → `controllers/` → `services/` → Supabase |
| **Middleware Chain** | Express `app.use()` stack in `app.js` |
| **Factory Middleware** | `requireRole(roles)`, `validate({body, params, query})` return new middleware functions |
| **asyncHandler Wrapper** | Wraps every controller to eliminate try/catch boilerplate |
| **State Machine** | `VALID_TRANSITIONS` object enforces order status progression |
| **Repository-ish Service Layer** | Each service file is the single point of contact for its resource |
| **Shared Schema (Monorepo)** | `shared/schemas/` exports Zod factories consumed by both frontend validators and backend validators |
| **Event-Driven UI** | `window.dispatchEvent(new CustomEvent('open-order-form'))` decouples ProductPage from the global CustomOrderForm modal |
| **Optimistic UI** | WishlistPage toggles wishlist icon before API confirms |
| **Token Refresh Queue** | Axios interceptor queues all 401 requests and replays them after token refresh |
| **Singleton Client** | `supabaseAdmin` and `supabasePublic` are created once at module load |
| **Bootstrap Deduplication** | `AuthContext` uses a module-level promise to prevent double `GET /auth/me` on StrictMode |

---

## 4. Feature-by-Feature Analysis

### 4.1 Authentication (Register → OTP → Login → JWT)

#### Flow Diagram

```
[RegisterPage.jsx]
  → POST /auth/register
    → auth.routes.js:18 → auth.controller.js:registerUser
      → auth.service.js:register()
        1. Validate: auth.validator.js registerSchema (Zod)
        2. supabase.auth.signUp(email, password) — creates auth.users row
        3. Polling loop (up to 3×500ms): wait for trigger to create public.users row
        4. If OTP enabled: generateOtp() → hash(SHA-256) → store in otpSessions Map
        5. sendOtpEmail() via nodemailer SMTP
        6. Return { requiresOtp: true } or full session

[RegisterPage.jsx] shows OTP input step
  → POST /auth/verify-otp
    → auth.controller.js:verifyOtp
      → auth.service.js:verifyOtp()
        1. Load session from otpSessions Map
        2. Check TTL (10 min), attempt count (max 5)
        3. timingSafeEqual(hash(input), storedHash)
        4. supabaseAdmin.auth.admin.updateUserById(id, { email_confirm: true })
        5. supabaseAdmin.from('users').update({ email_confirmed_at })
        6. Delete session from Map
        7. Return full JWT session

[LoginPage.jsx]
  → POST /auth/login
    → auth.service.js:login()
        1. supabase.auth.signInWithPassword(email, password)
        2. Load public.users row
        3. If email_confirmed_at is null → throw 403 "Email not verified"
        4. Return { token, refreshToken, user }

[All subsequent requests]
  → auth.middleware.js:authenticate
      1. Extract Bearer token from Authorization header
      2. supabasePublic.auth.getUser(token) — validates JWT signature + expiry
      3. SELECT id, email, full_name, role, avatar_url FROM users WHERE id = auth_user.id
      4. If role=seller: SELECT * FROM sellers WHERE user_id = id
      5. Attach { user, seller } to req
```

#### Key Files

| File | Role |
|---|---|
| `backend/src/services/auth.service.js:1-607` | All authentication business logic |
| `backend/src/validators/auth.validator.js` | Zod schemas for all auth payloads |
| `backend/src/middlewares/auth.middleware.js` | Per-request JWT verification |
| `frontend/src/pages/auth/RegisterPage.jsx` | Registration + OTP UI |
| `frontend/src/pages/auth/LoginPage.jsx` | Login UI with verified-banner |
| `frontend/src/context/AuthContext.jsx` | Client-side auth state |

#### Observations

- **Timing-safe OTP comparison** at `auth.service.js:375–384` using `crypto.timingSafeEqual` is a professional-grade security measure rarely seen in academic projects.
- **Registration polling loop** at `auth.service.js:195–212` (3×500ms waits for the Supabase trigger to fire) is fragile under load and adds 500–1500ms latency to every registration.
- **OTP is registration-only** (not login). This is clearly intentional and documented.
- After OTP success, `RegisterPage.jsx` navigates to `/login` instead of directly logging the user in, causing an extra round-trip that could be eliminated.

---

### 4.2 Custom Order Lifecycle (pending → accepted → ready → completed)

#### Flow Diagram

```
[ProductPage / ProductCard]
  → window.dispatchEvent(new CustomEvent('open-order-form', { detail: { product } }))
    → [CustomOrderForm.jsx] listens, opens 3-step modal
      Step 1: notes, budget_min, budget_max, deadline, reference_images
      Step 2: delivery_type, payment_method
      Step 3: client_name, client_phone, client_address
    → POST /orders (ordersAPI.create)
      → order.routes.js → order.controller.js:createOrder
        → order.service.js:createOrder()
          1. buildNormalizedOrderInput() from shared/schemas/order.schema.js
          2. Resolve seller_id from product's seller_id
          3. supabaseAdmin INSERT INTO orders (status='pending')
          4. supabaseAdmin INSERT INTO order_items
          5. createNotification(seller_id, 'new_order') — fire-and-forget
          → Returns created order

[SellerOrdersPage.jsx] — seller sees "pending" order
  → PATCH /orders/:id/status { status: 'accepted' | 'rejected', rejection_reason? }
    → order.service.js:updateOrderStatus()
      1. Load order, verify seller ownership (order.seller_id === req.seller.id)
      2. VALID_TRANSITIONS check: pending → accepted|rejected only
      3. supabaseAdmin UPDATE orders SET status
      4. createNotification(client_id, 'order_accepted' | 'order_rejected')

[SellerOrdersPage.jsx] — seller works on order, then marks ready
  → PATCH /orders/:id/ready { final_price, delivery_type }
    → order.service.js:markOrderReady()
      1. Load order, verify seller ownership
      2. VALID_TRANSITIONS check: accepted → ready only
      3. supabaseAdmin UPDATE orders SET status='ready', final_price, ready_at
      4. createNotification(client_id, 'order_ready')

[OrdersPage.jsx / OrderCard.jsx] — client sees "Ready" badge with final_price
  → PATCH /orders/:id/complete (no body needed)
    → order.service.js:confirmOrderComplete()
      1. requireRole('client') enforced at route
      2. Load order, verify client ownership (order.client_id === req.user.id)
      3. VALID_TRANSITIONS check: ready → completed only
      4. supabaseAdmin UPDATE orders SET status='completed', completed_at
      5. createNotification(seller_id, 'order_completed')

[Both sides] — Post-completion rating
  Client → POST /reviews/seller { seller_id, rating, comment }
           → review.service.js verifies completed order exists between client+seller
  Seller → POST /client-ratings { order_id, client_id, rating, comment }
           → clientRating.service.js verifies order.status='completed' AND order.seller_id=req.seller.id
```

#### Key Files

| File | Role |
|---|---|
| `backend/src/services/order.service.js:1-624` | Full lifecycle state machine |
| `backend/src/validators/order.validator.js` | Zod schemas for all order payloads |
| `backend/src/routes/order.routes.js` | Route definitions with role guards |
| `frontend/src/components/order/OrderCard.jsx:1-652` | UI for every order state |
| `frontend/src/components/order/CustomOrderForm.jsx` | 3-step order creation modal |
| `shared/schemas/order.schema.js` | Shared payload normalisation |

#### Observations

- `VALID_TRANSITIONS` object (`order.service.js:42–48`) is the canonical state machine. It prevents any status skip (e.g., `pending → completed`) without requiring complex conditional logic.
- Notification creation is fire-and-forget (`createNotification(...)` without `await`). This means a notification failure never blocks an order update — correct for user experience but means failed notifications are silently dropped. A dead-letter queue would be the production fix.
- The `markOrderReady` endpoint accepts `delivery_type` as well as `final_price`, allowing the seller to override the originally requested delivery method. This is intentional (seller confirms the feasible delivery option).

---

### 4.3 Product CRUD with Image Uploads

#### Flow Diagram

```
[SellerProducts.jsx] — Create / Edit product
  1. Upload images first:
     → POST /uploads/images (multipart/form-data)
       → upload.routes.js → upload.controller.js
         → upload.service.js:
           a. multer parses file into memory buffer
           b. file-type checks magic bytes (dependency present, verify usage in controller)
           c. sharp.resize(800).jpeg({ quality: 80 }) — compress
           d. supabaseAdmin.storage.from('product-images').upload(path, buffer)
           e. Returns public URL array

  2. Submit product form:
     → POST /products (or PUT /products/:id)
       → product.routes.js → product.controller.js:createProduct
         → product.service.js:
           a. SELECT seller WHERE user_id = req.user.id (ownership resolution)
           b. supabaseAdmin INSERT INTO products (...)
           c. supabaseAdmin INSERT INTO product_images (one row per URL)
           d. Returns product with joined images + seller + category

[BrowsePage / HomePage] — public product listing
  → GET /products?category=&search=&sort=&page=&limit=
    → product.service.js:getProducts()
      a. Build dynamic Supabase query with conditional filters
      b. Full-text search via products.fts TSVECTOR column (if search param present)
      c. Join product_images (position=0 only, for cover image)
      d. Join sellers, categories
      e. Return paginated { products, pagination }
```

#### Key Files

| File | Role |
|---|---|
| `backend/src/services/upload.service.js` | Sharp compress → Supabase Storage |
| `backend/src/routes/upload.routes.js` | Image upload endpoints |
| `backend/src/services/product.service.js` | Product CRUD + FTS queries |
| `frontend/src/pages/seller/SellerProducts.jsx` | Product management UI |

#### Observations

- **`sharp` integration** for image compression before upload is a professional-grade addition. All images are transcoded to JPEG at 80% quality and resized to 800px max width before storage.
- **`file-type` dependency** is installed (`package.json`) and is the correct tool for magic-byte validation. Whether the upload controller actually calls it needs verification — the upload route at `upload.routes.js:25-29` checks only `file.mimetype` (client-supplied). If the controller also relies solely on MIME type, a user could upload a non-image file disguised as an image.
- **Full-text search** uses PostgreSQL's native `TSVECTOR` column (`products.fts`), which is populated by a trigger. This is more efficient than `ILIKE` wildcard queries.

---

### 4.4 AI Chatbot (Client → Backend Proxy → Gemini)

#### Flow Diagram

```
[ChatbotWidget.jsx] — user types message, presses Enter
  1. State: messages[], isLoading, conversation (history)
  2. Snapshot current messages into history (last 20):
     const history = [...messages, userMsg].slice(-20)
     sent as conversation_history = history.slice(0,-1) (excludes current msg)
  → POST /chatbot { message, conversation_history }
    → chatbot.routes.js:
      a. authenticate middleware (token required)
      b. chatbotLimiter (20 req / 1 hour / user.id via keyGenerator)
      c. validate({ body: chatbotMessageSchema })
      → chatbot.controller.js:sendMessage
        → chatbot.service.js:sendMessage()
          a. Lazy-load GoogleGenerativeAI client (singleton on first call)
          b. toGeminiHistory(conversation_history):
             map role: 'assistant' → 'model', wrap content in { parts: [{ text }] }
          c. model.startChat({ history, systemInstruction })
          d. chat.sendMessage(message)
          e. On Gemini error: return fallback string "I'm currently unavailable..."
          f. Never throws — caller always gets a reply
      → sendSuccess(res, { reply })
  [ChatbotWidget.jsx]
    → Appends { role: 'assistant', content: reply } to messages
    → Auto-scrolls to bottom
```

#### Key Files

| File | Role |
|---|---|
| `backend/src/services/chatbot.service.js:1-69` | Gemini integration + history mapping |
| `backend/src/validators/chatbot.validator.js` | Message + history validation |
| `backend/src/routes/chatbot.routes.js` | Rate-limited route |
| `frontend/src/components/chatbot/ChatbotWidget.jsx:1-252` | Floating UI widget |

#### Observations

- **Graceful degradation**: if the Gemini API is unreachable or throws, the service returns a user-friendly fallback message rather than propagating a 500 error.
- **`systemInstruction`** is set at the model level (not as a user message), which prevents prompt injection via the `conversation_history` array.
- **Role translation** (`'assistant' → 'model'`) is a necessary detail because Gemini's API uses `'model'` while the OpenAI convention (and this app's frontend) uses `'assistant'`.
- The per-user rate limit uses `keyGenerator: (req) => req.user?.id || req.ip`, which correctly binds the limit to the authenticated user identity rather than IP address (which could be shared by many users behind NAT).

---

### 4.5 Notification System (Creation → Delivery → Read Status)

#### Flow Diagram

```
[Any service that generates a notification]
  → notification.service.js:createNotification(userId, type, title, body, meta)
    → supabaseAdmin INSERT INTO notifications (user_id, type, title, body, is_read=false, meta)
    (called fire-and-forget from order service — no await)

[MainLayout.jsx] — polls every 60 seconds for unread count
  → GET /notifications/unread-count
    → notification.service.js:getUnreadCount()
      → SELECT COUNT(*) FROM notifications WHERE user_id=req.user.id AND is_read=false

[NotificationsPage.jsx] — user opens notifications
  → GET /notifications?page=1&limit=20
    → notification.service.js:getNotifications()
      → SELECT * FROM notifications WHERE user_id ORDER BY created_at DESC
      → Returns { notifications, pagination }

[User marks notification read]
  → PATCH /notifications/:id/read
    → notification.service.js:markAsRead()
      → UPDATE notifications SET is_read=true WHERE id=:id AND user_id=req.user.id
        (ownership enforced in WHERE clause, not separate check)

[User marks all read]
  → PATCH /notifications/mark-all-read
    → UPDATE notifications SET is_read=true WHERE user_id=req.user.id AND is_read=false
```

#### Key Files

| File | Role |
|---|---|
| `backend/src/services/notification.service.js` | CRUD + ownership-scoped queries |
| `backend/src/routes/notification.routes.js` | 5 notification endpoints |
| `frontend/src/components/layout/MainLayout.jsx` | 60-second polling loop |
| `frontend/src/pages/NotificationsPage.jsx` | Notification list UI |

#### Observations

- Notifications use **polling** (60-second interval in MainLayout) rather than Supabase Realtime. This is simpler to implement and sufficient for MVP, but adds a 60-second delay from event to badge update.
- Ownership is enforced inline in the WHERE clause (`WHERE id=:id AND user_id=req.user.id`) rather than as a separate `SELECT` then `UPDATE`. This is efficient and secure — a 404 is returned if either condition fails, with no information leakage about whether the resource exists.
- The notification type enum is finite and documented: `new_order`, `order_accepted`, `order_rejected`, `order_ready`, `order_completed`, `system`. There is no `message` type — the chat feature is correctly absent.

---

### 4.6 Admin Operations (User Management, Seller Verification, Stats)

#### Flow Diagram

```
[Router guard: RequireAdmin in index.jsx]
  → checks user?.role === 'admin'
  → redirects non-admins to /

[AdminDashboard.jsx]
  → GET /admin/stats
    → admin.service.js:getStats()
      → Promise.all([
          SELECT role FROM users,
          SELECT is_active FROM products,
          SELECT status FROM orders,
          SELECT final_price FROM orders WHERE status='completed',
          SELECT COUNT(*) FROM reviews,
          SELECT COUNT(*) FROM users WHERE created_at >= first-of-month,
          SELECT COUNT(*) FROM orders WHERE created_at >= first-of-month,
          SELECT seller_id FROM orders WHERE status='completed',
          SELECT id, name, avg_rating FROM products WHERE is_active ORDER BY avg_rating DESC LIMIT 5
        ])
      → Aggregates all in memory, returns structured stats object

[AdminUsers.jsx]
  → GET /admin/users?page=&limit=&role=&search=
    → admin.service.js:getUsers()
      → SELECT id, email, full_name, role, avatar_url, created_at,
               seller:sellers(id, shop_name, is_verified)
         FROM users ORDER BY created_at DESC RANGE(offset, offset+limit)
         [optional .eq('role', role) .or('full_name.ilike, email.ilike')]
  → PATCH /admin/sellers/:id/verify { is_verified: bool }
    → admin.service.js:verifySeller()
      → UPDATE sellers SET is_verified WHERE id
      → PGRST116 → 404; other error → 500
  → PATCH /admin/users/:id/role { role: 'client'|'seller' }
    → admin.service.js:updateUserRole()
      → guard: adminId !== userId (cannot change own role)
      → guard: newRole !== 'admin' (cannot assign admin via API)
      → UPDATE users SET role WHERE id

[AdminProducts.jsx]
  → GET /admin/products?page=&search=&category= (no is_active filter)
    → admin.service.js:getProducts()
      → SELECT all products (active + inactive) with seller join
  → DELETE /admin/products/:id
    → admin.service.js:deleteProduct()
      → SELECT first (to confirm existence)
      → DELETE FROM products WHERE id
```

#### Key Files

| File | Role |
|---|---|
| `backend/src/services/admin.service.js:1-302` | All admin queries |
| `backend/src/controllers/admin.controller.js` | Thin delegating handlers |
| `backend/src/routes/admin.routes.js` | `router.use(authenticate, requireRole('admin'))` |
| `frontend/src/pages/admin/AdminDashboard.jsx` | Stats charts + top tables |
| `frontend/src/pages/admin/AdminUsers.jsx` | User management UI |
| `frontend/src/pages/admin/AdminProducts.jsx` | Product management UI |
| `frontend/src/router/index.jsx:126-141` | RequireAdmin guard |

#### Observations

- `router.use(authenticate, requireRole('admin'))` at the router level (`admin.routes.js:13`) means the admin role check applies to all admin routes automatically — no risk of accidentally leaving one endpoint unguarded.
- The `getStats()` function fires **9 concurrent Supabase queries** via `Promise.all`. While efficient, some queries (e.g., fetching all `status` values from the orders table) load full table data into Node.js memory for in-memory aggregation. Under high data volumes this would be replaced with SQL aggregate functions (`COUNT(*) GROUP BY status`).
- **Admin role cannot be assigned via API** (`updateUserRole` throws 403 if `newRole === 'admin'`). This prevents privilege escalation through the admin panel itself.

---

## 5. Security Audit

### 5.1 Critical

No critical (system-compromise) vulnerabilities found.

---

### 5.2 High

**S-H1 | In-memory OTP sessions do not survive process restart**
- File: `backend/src/services/auth.service.js:10-11`
- Description: `otpSessions` is a module-level `Map`. On process restart, crash, or multi-instance deployment, all pending OTP sessions are lost. Users mid-registration receive "Invalid or expired OTP" with no recovery path.
- Impact: Denial of registration service in any multi-instance or crash scenario.
- Fix: Persist sessions to a Supabase table (`otp_sessions`) with a `ttl` timestamp, or use Redis.

**S-H2 | In-memory password-reset tokens do not survive process restart**
- File: `backend/src/services/auth.service.js:11`
- Description: Same problem as S-H1 for the `resetTokenStore` Map used by `POST /auth/forgot-password` and `POST /auth/reset-password`.
- Impact: Reset links in already-sent emails become invalid after any deployment.
- Fix: Same — persist to DB table with TTL.

---

### 5.3 Medium

**S-M1 | MIME type validation relies on client-supplied `Content-Type` header**
- File: `backend/src/routes/upload.routes.js:25-29`
- Description: The multer `fileFilter` function checks `file.mimetype.startsWith('image/')`. This value comes from the `Content-Type` header in the multipart request, which any client can set to any value. The `file-type` package (installed as a dependency) performs magic-byte detection but its usage in the actual controller has not been confirmed.
- Impact: A malicious user could upload an HTML file or PHP shell with `Content-Type: image/jpeg`. Supabase Storage is public, so the file would be accessible.
- Fix: In `upload.controller.js` (or `upload.service.js`), use `fileTypeFromBuffer(buffer)` to verify actual file content before upload.

**S-M2 | JWT tokens stored in `localStorage` (XSS-accessible)**
- File: `frontend/src/services/api.js:236-240`
- Description: Both `hirftna_token` and `hirftna_refresh_token` are stored in `localStorage`. Any XSS vulnerability in the application (e.g., unsanitised content from user-generated fields rendered via `dangerouslySetInnerHTML`) gives an attacker permanent session access.
- Impact: Session hijacking. Refresh tokens do not expire quickly.
- Fix (architectural): Use `HttpOnly` cookies for token storage, implementing a backend `/auth/token` endpoint that sets the cookie. For MVP, ensure no `dangerouslySetInnerHTML` is used with user-generated content.
- Current mitigation: No obvious `dangerouslySetInnerHTML` usage found. `react-markdown` renders seller stories, which could be a vector if the markdown parser allows raw HTML.

**S-M3 | `PATCH /orders/:id/complete` lacks route-level role guard**
- File: `backend/src/routes/order.routes.js:87-95`
- Description: The route is protected only by `authenticate` (any authenticated user). The service-level check (`order.client_id !== req.user.id`) prevents actual exploitation, but a seller could probe the endpoint to discover whether order IDs exist (error message divergence).
- Fix: Add `requireRole('client', 'admin')` middleware to the route for defence in depth.

**S-M4 | Three DB queries on every authenticated request**
- File: `backend/src/middlewares/auth.middleware.js:61-76`
- Description: Every authenticated request performs: `supabasePublic.auth.getUser()` (network call to Supabase Auth) + `SELECT FROM users` + conditional `SELECT FROM sellers`. Under load this is a significant latency contribution.
- Impact: Reliability/performance rather than security, but auth middleware failures could open timing-based information leakage.
- Fix: Cache user data (5-minute TTL) keyed on JWT token hash using a lightweight in-memory LRU cache.

---

### 5.4 Low

**S-L1 | `client_id` in client-rating payload is attacker-controlled**
- File: `backend/src/validators/clientRating.validator.js:13`
- Description: `client_id` is accepted in the request body and cross-checked against `order.client_id`. If the cross-check were ever removed, a seller could rate arbitrary users.
- Fix: Derive `client_id` from the order in the service layer; remove it from the validator entirely.

**S-L2 | CORS allows requests with no origin header**
- File: `backend/src/app.js:35-36`
- Description: `if (!origin) return callback(null, true)` accepts any request from a non-browser context (curl, Postman, server-side scripts). Standard for REST APIs but worth documenting.
- Impact: Minimal — JWT is still required for all protected endpoints.

**S-L3 | `changePassword` calls `signInWithPassword` (counts toward Supabase auth rate limit)**
- File: `backend/src/services/auth.service.js:474-498`
- Description: Old-password verification calls the public Supabase auth client, consuming the platform's shared login rate limit quota.
- Fix: Use `supabaseAdmin.auth.admin.getUserById` to verify the old password hash directly without consuming the public auth rate limit.

---

## 6. Bug Report

### 6.1 High — Functional breakage

**B-H1 | Product review form on ProductPage does not include required `order_id`**
- File: `frontend/src/pages/ProductPage.jsx:344-382`
- Description: The inline review form calls `reviewsAPI.createReview({ product_id, rating, comment })`. The backend validator (`backend/src/validators/review.validator.js:10-13`) requires `order_id` as a non-optional UUID.
- Impact: Every review submission from this form returns HTTP 400. Users who write a review see the form reset with no confirmation.
- Fix: Either remove this inline form and replace it with the `ReviewProductModal` component (which presumably passes `order_id`), or add an `order_id` selector to the inline form that fetches the user's completed order for this product.

---

### 6.2 Medium — Reliability / data integrity

**B-M1 | Registration polling loop is slow and fails silently under load**
- File: `backend/src/services/auth.service.js:195-212`
- Description: After `supabase.auth.signUp()`, the code retries up to 3 times at 500ms intervals waiting for the `on_auth_user_created` trigger to write the `public.users` row. If the trigger takes longer than 1.5 seconds (possible under DB load), a partial fallback profile is built from auth data only (line 240–250), with `null` for `role`, `full_name`, and other fields. The user may then receive a token that does not match a proper DB record.
- Fix: Use `supabaseAdmin.auth.admin.createUser()` with `email_confirm: !otpEnabled` which is synchronous. Or increase retry count and add exponential backoff.

**B-M2 | `clientRating.service.js` average rating calculated from current page only**
- File: `backend/src/services/clientRating.service.js:123-126`
- Description: `avgRating` is computed in-memory from the array of ratings on the current page. For a client with 50 ratings and `limit=20`, the returned average is computed over 20 rows, not 50.
- Fix: Run a separate `SELECT AVG(rating) FROM client_ratings WHERE client_id=?` aggregate query, or store a denormalised `avg_rating` column on the `users` table (with a trigger, matching the pattern used for products and sellers).

---

### 6.3 Low — Minor / UX issues

**B-L1 | `review.controller.js` reads `req.params` instead of `req.validated.params`**
- File: `backend/src/controllers/review.controller.js:11, 42`
- Description: `const { product_id } = req.params` and `const { seller_id } = req.params` read from raw request params. The project convention is to always use `req.validated.params` after the `validateId()` middleware writes to it.
- Impact: Not a security or functional bug (UUID validation still runs), but violates the project's own separation contract.
- Fix: Replace with `const { product_id } = req.validated.params`.

**B-L2 | SellerOrdersPage purchases tab never refreshes after first load**
- File: `frontend/src/pages/seller/SellerOrdersPage.jsx:191`
- Description: The condition `if (activeTab === 'purchases' && purchaseOrders.length === 0 && !loadingPurchases)` prevents re-fetching if the tab was already loaded. New orders placed by the seller while the page is open are not reflected without a full page reload.
- Fix: Remove the `purchaseOrders.length === 0` condition; always re-fetch on tab switch, or add a manual refresh button.

**B-L3 | OTP verification in RegisterPage does not update AuthContext state**
- File: `frontend/src/pages/auth/RegisterPage.jsx:86-96`
- Description: `handleOtpVerify` calls `authAPI.verifyOtp()` directly and navigates to `/login`. If the backend returns a session token on successful OTP verification, it is discarded. The user must perform a full login.
- Impact: Extra step for users; could be eliminated.
- Fix: After OTP verification, call `AuthContext.login()` or `persistSession(token, refreshToken, user)` with the returned session data to log the user in immediately.

---

## 7. Code Quality Assessment

### 7.1 Patterns Followed Consistently

| Pattern | Evidence |
|---|---|
| **Strict MVC separation** | No database query in any controller file; all queries in service files |
| **Single validation source of truth** | Controllers never access `req.body` — only `req.validated.{body/params/query}` |
| **Standardised API responses** | All endpoints use `sendSuccess` / `sendError` / `sendCollection` from `response.js` |
| **asyncHandler for all controllers** | No raw try/catch in controller layer |
| **AppError for all expected errors** | Services throw `new AppError(message, statusCode)`, not generic `Error` |
| **No hardcoded credentials** | All keys loaded from `env.js` which validates on startup |
| **Consistent logging** | `logger.info` / `logger.error` calls with structured JSON objects throughout services |
| **Paginated list endpoints** | All list endpoints accept `page` + `limit` query params |
| **Ownership checks before mutation** | Seller/client ownership verified in service layer before any UPDATE/DELETE |
| **Fire-and-forget notifications** | `createNotification()` never awaited — order operations never fail due to notification errors |

### 7.2 Patterns Violated

| Issue | Location | Notes |
|---|---|---|
| `req.params` used instead of `req.validated.params` | `review.controller.js:11, 42` | Contract violation, not a security issue |
| Direct `authAPI.*` call bypassing AuthContext | `RegisterPage.jsx:86-96` | OTP verify doesn't update auth state |
| Inline review form missing required field | `ProductPage.jsx:358` | Results in permanent 400 error |
| Some frontend pages use `alert()` for error display | `AdminProducts.jsx:73` | Replace with Toast component |

### 7.3 Consistency Score

| Dimension | Score | Notes |
|---|---|---|
| File naming (`feature.type.js`) | 10/10 | Perfect consistency |
| Error handling approach | 9/10 | One controller bypasses AppError |
| API response format | 10/10 | All endpoints use shared helpers |
| Variable naming (camelCase) | 10/10 | No deviations found |
| Middleware ordering | 10/10 | Follows documented stack in `app.js` |
| Controller thinness | 9/10 | Slight business logic leak in auth controller |
| Service layer purity | 9/10 | Services are self-contained |
| Frontend component decomposition | 8/10 | OrderCard.jsx is 652 lines — could be split |
| i18n coverage | 8/10 | Most strings use `t()` but some hardcoded English strings in admin pages |
| **Overall** | **9.2/10** | High maturity for an academic project |

### 7.4 Dead Code / Unused Items

| Item | Location | Notes |
|---|---|---|
| `CartContext.jsx` | `frontend/src/context/` | Empty, unused — should be deleted |
| `getSellerReviews` alias | `api.js:380` | Identical to `getSellerRatings`; remove |
| `components/auth/` directory | `frontend/src/components/auth/` | No components inside; empty directory |

### 7.5 Notable Code Strengths

1. **Shared Zod schema factory** (`shared/schemas/`): Frontend and backend consume the same schema definitions via a `createAuthSchemas(z)` factory pattern, ensuring payload contracts can never drift silently.

2. **`requireRole()` validates arguments at startup** (`role.middleware.js:37–52`): Typos in role names throw at server boot, not at request time. This eliminates a class of silent runtime 403 bugs.

3. **Sensitive-field redaction in logs** (`logger.js`): The Winston logger automatically strips `password`, `token`, and similar fields from log output, preventing accidental secret leakage in production logs.

4. **Express 5 compatibility note** (`validate.middleware.js`): A comment explains that `req.query` is read-only in Express 5 and that `req.validated.query` exists for this reason. This kind of documented workaround for framework-specific behaviour demonstrates thorough understanding.

5. **`sharp` image pipeline** (`upload.service.js`): Images are resized (max 800px) and recompressed (JPEG 80%) before upload, reducing storage costs and ensuring consistent image dimensions across the platform.

---

## 8. Frontend–Backend Alignment

### 8.1 Confirmed Matches

| Frontend call | Backend endpoint | Status |
|---|---|---|
| `authAPI.register` | `POST /auth/register` | ✅ Match |
| `authAPI.login` | `POST /auth/login` | ✅ Match |
| `authAPI.verifyOtp` | `POST /auth/verify-otp` | ✅ Match |
| `authAPI.forgotPassword` | `POST /auth/forgot-password` | ✅ Match |
| `authAPI.resetPassword` | `POST /auth/reset-password` | ✅ Match |
| `ordersAPI.create` | `POST /orders` | ✅ Match |
| `ordersAPI.markReady` | `PATCH /orders/:id/ready` | ✅ Match |
| `ordersAPI.confirmComplete` | `PATCH /orders/:id/complete` | ✅ Match |
| `clientRatingsAPI.create` | `POST /client-ratings` | ✅ Match |
| `clientRatingsAPI.getByClient` | `GET /client-ratings/client/:id` | ✅ Match |
| `chatbotAPI.sendMessage` | `POST /chatbot` | ✅ Match |
| `adminAPI.getUsers` | `GET /admin/users` | ✅ Match |
| `adminAPI.getProducts` | `GET /admin/products` | ✅ Match |
| `adminAPI.getStats` | `GET /admin/stats` | ✅ Match |
| `adminAPI.verifySeller` | `PATCH /admin/sellers/:id/verify` | ✅ Match |
| `adminAPI.deleteProduct` | `DELETE /admin/products/:id` | ✅ Match |
| `adminAPI.updateUserRole` | `PATCH /admin/users/:id/role` | ✅ Match |

### 8.2 Mismatches and Issues

| Issue | Severity | Details |
|---|---|---|
| `reviewsAPI.createReview` omits `order_id` | **High** | Frontend sends `{ product_id, rating, comment }`. Backend requires `order_id` as non-optional UUID. Every call returns HTTP 400. |
| `reviewsAPI.getSellerReviews` duplicates `getSellerRatings` | Low | Both call `GET /reviews/seller/:id`. One is redundant. |
| `usersAPI.getPublicProfile(id)` vs `GET /users/:id` | Info | Route exists (`user.routes.js`); frontend `usersAPI` has `getPublicProfile`. Confirmed match from route registration. |

### 8.3 Field Name Consistency

| Field | Frontend usage | Backend response | Status |
|---|---|---|---|
| `product.images[].image_url` | `product.images?.[0]?.image_url` | `image_url` (not `url`) | ✅ Consistent |
| `seller.shop_name` | Accessed throughout | DB column name | ✅ Consistent |
| `order.final_price` | `order.final_price` | DB column name | ✅ Consistent |
| `order.rejection_reason` | Displayed in OrderCard | DB column name | ✅ Consistent |
| `chatbot conversation_history` | `conversation_history` | validator key | ✅ Consistent |
| `client rating body.client_id` | Sent in payload | validator accepts it | ✅ Consistent (but redundant — see S-L1) |

---

## 9. Performance Observations

### 9.1 Backend

**P-B1 | Three DB round-trips per authenticated request**
Every request to a protected endpoint incurs: Supabase Auth JWT verification (remote call) + `SELECT FROM users` + `SELECT FROM sellers` (for seller endpoints). Under 100 concurrent authenticated requests, this means 300 simultaneous DB connections.
- Estimated impact: +30–80ms latency per request
- Fix: Implement an LRU cache in `auth.middleware.js` keyed on `jti` (JWT ID) or token hash with a 5-minute TTL.

**P-B2 | `getStats()` loads full table data into memory for aggregation**
`admin.service.js:getStats()` fetches all `users.role` values, all `products.is_active` values, and all `orders.status` values as arrays, then counts them in JavaScript.
- At 10 000 users this transfers and parses the full users table for every dashboard load.
- Fix: Replace with SQL aggregate queries: `SELECT role, COUNT(*) FROM users GROUP BY role`.

**P-B3 | Top sellers computed in-memory from all completed orders**
`admin.service.js:138–152` fetches all completed orders to rank sellers by order count. This is an O(n) scan of the entire completed orders table.
- Fix: Use `SELECT seller_id, COUNT(*) FROM orders WHERE status='completed' GROUP BY seller_id ORDER BY count DESC LIMIT 5`.

**P-B4 | Notification polling at 60-second intervals**
All authenticated users generate a `GET /notifications/unread-count` request every 60 seconds from `MainLayout.jsx`. With 100 concurrent users this is ~1.7 requests/second of polling overhead.
- Fix for production: Replace with Supabase Realtime subscription on the `notifications` table filtered by `user_id`.

### 9.2 Frontend

**P-F1 | `OrderCard.jsx` is 652 lines — re-renders entire card on any state change**
Every button click (loading state for accept, reject, ready, complete, rate) triggers a re-render of the entire 652-line component. No `useMemo` or `React.memo` is used.
- Impact: Minor for MVP data volumes; noticeable in seller dashboards with 50+ orders.
- Fix: Split into sub-components (`OrderHeader`, `OrderActions`, `OrderDetails`) each with isolated state.

**P-F2 | `ProductPage.jsx` is 697 lines with multiple sequential API calls on mount**
On mount: `productsAPI.getById` → `reviewsAPI.getProductReviews` → `reviewsAPI.getSellerRatings` → `wishlistAPI.check` — these are sequential, not parallelised.
- Fix: Use `Promise.all([...])` for the review + wishlist calls that do not depend on the product response.

**P-F3 | No image lazy loading or pagination in product grids**
Product grids render all product images eagerly. For a page with 20 products showing 3 images each, this is 60 simultaneous image requests.
- Fix: Add `loading="lazy"` to all `<img>` tags in `ProductCard.jsx` and `ProductGrid.jsx`.

---

## 10. Technical Debt Inventory

Ranked by business impact (high = breaks production or blocks users; low = quality/maintenance only):

| Rank | Item | Category | Effort | Impact |
|---|---|---|---|---|
| 1 | Persist OTP sessions and reset tokens to DB | Reliability | Medium (1–2 days) | High — breaks in multi-instance/crash scenarios |
| 2 | Fix product review form `order_id` missing on ProductPage | Bug | Low (2 hours) | High — review submission broken for all users |
| 3 | Replace magic-byte file type validation (use `file-type` buffer) | Security | Low (2 hours) | High — upload security gap |
| 4 | Auth middleware request-level caching | Performance | Medium (1 day) | Medium — 3× DB overhead on every request |
| 5 | Replace in-memory stats aggregation with SQL GROUP BY | Performance | Medium (1 day) | Medium — admin dashboard breaks at scale |
| 6 | Add Supabase Realtime notifications | UX | Medium (1–2 days) | Medium — 60-second notification delay |
| 7 | `PATCH /orders/:id/complete` route-level role guard | Security | Low (30 min) | Medium — defence-in-depth gap |
| 8 | Fix `review.controller.js` to use `req.validated.params` | Quality | Low (30 min) | Low — contract violation |
| 9 | Fix `RegisterPage.jsx` to log user in directly after OTP | UX | Low (2 hours) | Low — extra login step |
| 10 | Fix `clientRating.service.js` avg rating aggregation | Data integrity | Low (2 hours) | Medium — wrong statistics displayed |
| 11 | Delete `CartContext.jsx` | Quality | Low (5 min) | Low — dead code |
| 12 | Remove `getSellerReviews` duplicate in `api.js` | Quality | Low (5 min) | Low — dead export |
| 13 | Split `OrderCard.jsx` into sub-components | Maintainability | Medium (1 day) | Low — performance & readability |
| 14 | Add `loading="lazy"` to product images | Performance | Low (1 hour) | Medium — page load time |
| 15 | Replace `alert()` in `AdminProducts.jsx` with Toast | Quality | Low (30 min) | Low — inconsistent UX |

---

## 11. Compliance Check

This section evaluates how well the implementation matches the specification defined in `CONTEXT.md`.

### 11.1 Core Business Logic Rules

| Rule | Status | Notes |
|---|---|---|
| No direct chat between client and seller | ✅ Compliant | No `messages` table, no chat feature. Custom order system is the only communication path. |
| Chatbot is assistant only | ✅ Compliant | Gemini system prompt restricts it to Q&A. No order creation via chatbot. |
| Custom Order replaces messaging | ✅ Compliant | The `messages` notification type is absent. |
| Final price set by seller after accepting | ✅ Compliant | `final_price` is NULL until `PATCH /orders/:id/ready` sets it. |
| Wishlist for both clients AND sellers | ✅ Compliant | `RequireAuth` (not `RequireClient`) guards `/wishlist`. |
| No stock checks | ✅ Compliant | No `stock` field in products schema. All orders are made-to-order. |

### 11.2 API Design Rules

| Rule | Status | Notes |
|---|---|---|
| `/api/v1/{resource}` URL structure | ✅ Compliant | All routes follow the pattern. |
| Standard `{ success, message, data }` response format | ✅ Compliant | Enforced by `sendSuccess`/`sendError` helpers. |
| Pagination on all list endpoints | ✅ Compliant | All list endpoints accept `page` + `limit`. |
| UUID validation on all `:id` params | ✅ Compliant | `validateId()` middleware on all parameterised routes. |

### 11.3 Security Rules

| Rule | Status | Notes |
|---|---|---|
| Never use `req.body` directly | ✅ Compliant (99%) | One deviation in `review.controller.js` (uses `req.params` not `req.validated.params`). |
| Never trust client-provided user IDs | ✅ Compliant | All user IDs derived from JWT (`req.user.id`). |
| Never skip pagination | ✅ Compliant | — |
| Never allow rating unless order completed | ✅ Compliant | Both `review.service.js` and `clientRating.service.js` verify `order.status === 'completed'`. |
| Never allow seller to call `/complete` | ✅ Compliant | `requireRole('client')` enforced (partially at middleware, fully at service level). |
| Never use Stripe | ✅ Compliant | No Stripe dependency. |
| Never add chat/messaging | ✅ Compliant | — |
| Never use OpenAI | ✅ Compliant | `@google/generative-ai` (Gemini) used exclusively. |

### 11.4 COMMON MISTAKES TO AVOID Compliance

| Rule | Status |
|---|---|
| ❌ Never use req.body directly | ✅ Followed (except `review.controller.js:11,42` uses `req.params`) |
| ❌ Never return full error details in production | ✅ `errorHandler` filters stack traces in production |
| ❌ Never skip ownership check | ✅ All services check ownership before mutation |
| ❌ Never hardcode keys/URLs | ✅ All config via `env.js` |
| ❌ Never commit .env | ✅ `.env` is in `.gitignore` |
| ❌ Never use supabaseAdmin in frontend | ✅ Frontend uses only Axios + Supabase public client for token refresh |
| ❌ Never skip pagination | ✅ All list endpoints paginated |
| ❌ Never add stock checks | ✅ No stock field or check anywhere |

### 11.5 Phase Completion

| Phase | Status |
|---|---|
| Phase 1 — Foundation | ✅ Complete |
| Phase 2 — Authentication + 2FA | ✅ Complete |
| Phase 3 — Categories | ✅ Complete |
| Phase 4 — Products | ✅ Complete |
| Phase 5 — File Uploads | ✅ Complete |
| Phase 6 — Sellers | ✅ Complete |
| Phase 7 — Orders (all transitions) | ✅ Complete |
| Phase 8 — Reviews & Ratings | ✅ Complete |
| Phase 9 — Wishlist | ✅ Complete |
| Phase 10 — Notifications | ✅ Complete |
| Phase 11 — Client Ratings | ✅ Complete |
| Phase 12 — AI Chatbot (Gemini) | ✅ Complete |
| Phase 13 — Admin Dashboard | ✅ Complete |
| Phase 14 — Auth Polish (forgot/reset password, OTP registration-only) | ✅ Complete |
| Phase 15 — Payments (Chargily, frontend-only) | ⬜ Planned |

---

## 12. Recommendations

Listed in priority order (1 = most urgent).

### R1 — Persist OTP sessions and reset tokens (Priority: Critical)
Replace the in-memory `Map` objects in `auth.service.js` with Supabase table-backed storage. Create tables `otp_sessions(id, email, hash, expires_at, attempts)` and `password_resets(id, user_id, token_hash, expires_at, used)`. This is the single most important production readiness fix.

### R2 — Fix product review submission on ProductPage (Priority: High)
The inline review form at `ProductPage.jsx:358` permanently returns HTTP 400 because it omits `order_id`. Replace it with the modal-based review component or add a completed-order selector. This blocks all product reviews from the product detail page.

### R3 — Implement magic-byte file type validation (Priority: High)
In `upload.service.js` (or `upload.controller.js`), call `fileTypeFromBuffer(buffer)` after multer parses the file, before Sharp processing. Reject uploads where the detected type is not in `['image/jpeg', 'image/png', 'image/webp', 'image/gif']`.

### R4 — Cache auth middleware results (Priority: Medium)
Add an LRU cache (e.g., `lru-cache` npm package, max 1000 entries, 5-minute TTL) in `auth.middleware.js`. Key on a SHA-256 hash of the JWT token. This eliminates the 3× DB round-trip overhead on every authenticated request and significantly reduces Supabase connection pool pressure.

### R5 — Replace SQL aggregation with GROUP BY queries in admin stats (Priority: Medium)
Rewrite `admin.service.js:getStats()` to use proper SQL:
```sql
SELECT role, COUNT(*) FROM users GROUP BY role;
SELECT is_active, COUNT(*) FROM products GROUP BY is_active;
SELECT status, COUNT(*) FROM orders GROUP BY status;
SELECT seller_id, COUNT(*) FROM orders WHERE status='completed' GROUP BY seller_id ORDER BY count DESC LIMIT 5;
```
This reduces memory usage from O(rows) to O(distinct values) and is orders of magnitude faster at scale.

### R6 — Add `PATCH /orders/:id/complete` route-level role guard (Priority: Medium)
In `order.routes.js`, add `requireRole('client', 'admin')` to the `/complete` route. The service-level guard is already correct; this is defence in depth.

### R7 — Fix `clientRating.service.js` average rating calculation (Priority: Medium)
Replace the in-memory average with a SQL aggregate: `SELECT AVG(rating) FROM client_ratings WHERE client_id = ?`. Display this per-client score on `ClientProfilePage.jsx`.

### R8 — Replace 60-second notification polling with Supabase Realtime (Priority: Medium)
In `MainLayout.jsx`, replace the `setInterval` poll with a Supabase Realtime subscription:
```javascript
supabase.channel('notifications')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${user.id}` }, handleNewNotification)
  .subscribe();
```
This provides instant notification delivery without polling overhead.

### R9 — Log user in directly after OTP verification (Priority: Low)
In `RegisterPage.jsx:handleOtpVerify`, after `authAPI.verifyOtp()` succeeds, call `AuthContext.login()` or `persistSession(data.token, data.refreshToken, data.user)` with the returned credentials. Navigate to `/` (home) instead of `/login`. This eliminates the unnecessary extra login step after email verification.

### R10 — Delete dead code and split large components (Priority: Low)
- Delete `frontend/src/context/CartContext.jsx` (empty, never used)
- Remove duplicate `getSellerReviews` from `api.js`
- Split `OrderCard.jsx` (652 lines) into `OrderHeader`, `OrderActions`, `OrderDetails` sub-components
- Replace `alert()` in `AdminProducts.jsx:73` with the existing `Toast.jsx` component
- Add `loading="lazy"` to all `<img>` tags in `ProductCard.jsx`

---

## Appendix A — Complete Dependency Table

### Backend Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@google/generative-ai` | 0.24.1 | Gemini 1.5 Flash AI API client |
| `@supabase/supabase-js` | 2.99.1 | PostgreSQL ORM + Auth + Storage client |
| `compression` | 1.8.1 | Gzip HTTP response compression |
| `cors` | 2.8.6 | CORS header management |
| `dotenv` | 17.4.2 | `.env` file parsing |
| `express` | 5.2.1 | HTTP web framework (v5 stable) |
| `express-rate-limit` | 8.3.1 | IP/user-based rate limiting |
| `file-type` | 22.0.0 | Magic-byte MIME type detection |
| `helmet` | 8.1.0 | HTTP security headers (15 headers) |
| `hpp` | 0.2.3 | HTTP parameter pollution protection |
| `morgan` | 1.10.1 | HTTP request access log |
| `multer` | 2.1.1 | `multipart/form-data` file parser |
| `nodemailer` | 8.0.7 | SMTP email transport |
| `sharp` | 0.34.5 | Image resize + JPEG compression |
| `slugify` | 1.6.8 | URL slug generation |
| `uuid` | 13.0.0 | UUIDv4 generation |
| `winston` | 3.19.0 | Structured logging + log rotation |
| `zod` | 4.3.6 | Schema validation |

### Frontend Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | 2.103.0 | Auth token refresh (client-side only) |
| `axios` | 1.15.0 | HTTP client with interceptors |
| `clsx` | 2.1.1 | Conditional class name utility |
| `i18next` | 26.0.5 | Internationalisation framework |
| `i18next-browser-languagedetector` | 8.2.1 | Browser language auto-detection |
| `lucide-react` | 1.8.0 | SVG icon library |
| `react` | 19.2.4 | UI library |
| `react-dom` | 19.2.4 | DOM renderer |
| `react-i18next` | 17.0.4 | React bindings for i18next |
| `react-markdown` | 10.1.0 | Markdown-to-JSX renderer (seller stories) |
| `react-router-dom` | 7.14.0 | Client-side routing |
| `zod` | 4.3.6 | Client-side schema validation |

---

## Appendix B — Database Schema Summary

| Table | Rows (at analysis time) | Key columns |
|---|---|---|
| `users` | Unknown | `id, email, role, full_name, avatar_url` |
| `sellers` | Unknown | `id, user_id, shop_name, is_verified, avg_rating` |
| `categories` | 9 (pre-filled) | `id, name, slug, icon_url` |
| `products` | Unknown | `id, seller_id, price_min, price_max, is_active, fts` |
| `product_images` | Unknown | `id, product_id, image_url, position` |
| `orders` | Unknown | `id, client_id, seller_id, status, final_price, ready_at, completed_at` |
| `order_items` | Unknown | `id, order_id, product_id, quantity, unit_price` |
| `reviews` | Unknown | `id, product_id, client_id, rating, comment` |
| `ratings` | Unknown | `id, seller_id, client_id, rating` |
| `client_ratings` | Unknown | `id, order_id, seller_id, client_id, rating` |
| `wishlist` | Unknown | `id, user_id, product_id` |
| `notifications` | Unknown | `id, user_id, type, title, body, is_read, meta` |
| `subscriptions` | Unknown | `id, seller_id, plan, is_active` |
| `promotions` | Unknown | `id, seller_id, product_id, placement, is_active` |
| `browsing_events` | Unknown | `id, user_id, product_id, event_type` |

---

*Report generated: 2026-05-07*
*Codebase version: branch `new-version` (commit 3fa4f41)*
*Analysis method: Automated multi-pass file reading (60 files) + cross-reference with CONTEXT.md and FRONTEND_CONTEXT.md*
*Total files analysed: ~76 source files*
