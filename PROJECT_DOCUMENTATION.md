# PROJECT DOCUMENTATION — Hirftna Marketplace
> Complete technical reference · Last updated: 2026-05-19 · Status: MVP Feature-Complete

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema](#3-database-schema)
4. [Backend Documentation](#4-backend-documentation)
5. [Frontend Documentation](#5-frontend-documentation)
6. [Key Features In Depth](#6-key-features-in-depth)
7. [Design System](#7-design-system)
8. [Security Model](#8-security-model)
9. [Internationalization (i18n)](#9-internationalization-i18n)
10. [Development Journey](#10-development-journey)
11. [Environment Variables](#11-environment-variables)
12. [Known Limitations & Future Work](#12-known-limitations--future-work)
13. [Appendices](#13-appendices)

---

## 1. Executive Summary

**Hirftna** (حرفتنا — "Our Craft") is an Algerian artisan marketplace that connects skilled craftspeople with clients through a structured, trust-based system. Unlike general e-commerce platforms, Hirftna is purpose-built for handmade, made-to-order products — where every item is crafted specifically for the buyer.

### What Makes Hirftna Different

| Platform | Hirftna | Generic Marketplace |
|----------|---------|---------------------|
| Products | Made-to-order (no stock) | In-stock inventory |
| Communication | Structured Custom Order flow | Direct buyer-seller messaging |
| Pricing | Negotiated via order (min/max budget → final price) | Fixed price |
| Trust | Mutual rating system (clients rate sellers AND sellers rate clients) | One-way ratings |
| Language | Arabic-first (RTL), with English and French | Usually English-first |

### Core Innovation: The Custom Order System

There is **no direct messaging** between clients and sellers. All negotiation, communication, and coordination happens through the order lifecycle:

```
Client submits order (with budget range + deadline + reference images)
    ↓ Seller reviews → Accept or Reject (with reason)
    ↓ Seller works on the item
    ↓ Seller marks Ready (sets final price + delivery method)
    ↓ Client confirms Completion
    ↓ Both sides rate each other
```

This design eliminates spam, ghosting, and unstructured negotiation — creating a professional, accountable interaction.

### Tech Stack at a Glance

- **Backend:** Node.js 20 + Express.js v5, hosted on **Render**
- **Frontend:** React 18 + Vite + TailwindCSS, hosted on **Vercel**
- **Database:** Supabase (PostgreSQL 15), EU West region
- **Auth:** Supabase Auth + custom OTP 2FA via email
- **AI:** Google Gemini 1.5 Flash (chatbot assistant)
- **Payments:** Chargily (Algerian payment gateway, MVP simulated)
- **Languages:** Arabic (default, RTL) · English · French (partial)

---

## 2. Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                                                                  │
│   Browser / Mobile Browser                                       │
│   React 18 + Vite (Vercel CDN)                                   │
│   TailwindCSS · React Router v6 · react-i18next                  │
│   Arabic/RTL default · Responsive (mobile-first)                 │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTPS + JWT Bearer Token
                               │ All requests to /api/v1/*
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                                  │
│                                                                  │
│   Node.js 20 + Express.js v5 (Render.com)                        │
│   Middleware: helmet → cors → hpp → compression →                │
│               json → morgan → rateLimiter →                      │
│               authenticate → requireRole → validate              │
│   13 route groups · Zod validation · Winston logging             │
└────────────┬─────────────────────────────┬────────────────────── ┘
             │                             │
             ▼                             ▼
┌────────────────────────┐    ┌────────────────────────────────────┐
│   SUPABASE AUTH        │    │   SUPABASE DATABASE                 │
│                        │    │                                     │
│  JWT verification      │    │  PostgreSQL 15 (EU West)            │
│  User registration     │    │  16 tables                          │
│  Email confirmation    │    │  4 DB triggers                      │
│  (ANON key)            │    │  Full-text search (tsvector)        │
│                        │    │  (SERVICE ROLE key)                  │
└────────────────────────┘    └────────────────────────────────────┘
                                          │
                               ┌──────────┴──────────┐
                               │  SUPABASE STORAGE   │
                               │  product-images     │
                               │  avatars            │
                               └─────────────────────┘

External Services:
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  GOOGLE GEMINI   │  │  SMTP (email)    │  │  CHARGILY        │
│  AI Chatbot      │  │  OTP + Password  │  │  Algerian        │
│  1.5 Flash       │  │  Reset emails    │  │  Payments (MVP)  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Data Flow — Authenticated Request

```
User action in React
  → Axios interceptor adds Authorization: Bearer {token}
  → POST /api/v1/orders (example)
  → helmet/cors/hpp check headers
  → express.json() parses body
  → globalLimiter: 100 req/15min/IP
  → authenticate middleware:
      supabasePublic.auth.getUser(token) → validates JWT
      supabase.from('users').select('*, sellers(id)') → loads user + seller_id
      req.user = { id, email, role, seller_id }
  → requireRole('seller') → checks req.user.role
  → validate(orderSchema) → Zod validates req.body
      passes → req.validated.body = clean data
      fails → 400 with field-level errors
  → orderController.createOrder(req, res)
  → orderService.createOrder(req.user, req.validated.body)
      → validates items belong to same seller
      → creates order row + order_items rows (atomic, with rollback)
      → sends notification to seller
      → returns { order, items }
  → res.status(201).json({ success: true, data: { order, items } })
```

### Token Refresh Flow (Frontend)

```
API call fails with 401
  → api.js interceptor catches response error
  → If !isRefreshing: set isRefreshing = true, start refresh
  → Concurrent 401 requests queued in failedQueue
  → authAPI.refreshToken() called
  → On success: flush queue with new token, retry original requests
  → On failure: clear session, redirect to /login
```

---

## 3. Database Schema

### Table Summary

| # | Table | Purpose | Key Relationships |
|---|-------|---------|-------------------|
| 1 | `users` | All user accounts (mirrors Supabase Auth) | Base table for all roles |
| 2 | `sellers` | Seller shop profiles | `user_id` → users |
| 3 | `categories` | Product categories (9 pre-seeded) | Used by products + sellers |
| 4 | `products` | Artisan product listings | `seller_id` → sellers, `category_id` → categories |
| 5 | `product_images` | Product photos | `product_id` → products |
| 6 | `orders` | Custom orders (the core feature) | `client_id` → users, `seller_id` → sellers |
| 7 | `order_items` | Products within an order | `order_id` → orders, `product_id` → products |
| 8 | `reviews` | Client reviews of products (1-5 stars) | `product_id` → products, `client_id` → users |
| 9 | `ratings` | Client ratings of sellers (1-5 stars) | `seller_id` → sellers, `client_id` → users |
| 10 | `client_ratings` | Seller ratings of clients (1-5 stars) | `order_id` → orders, one per completed order |
| 11 | `wishlist` | Saved products (all auth users) | `user_id` → users, `product_id` → products |
| 12 | `notifications` | In-app notifications | `user_id` → users |
| 13 | `subscriptions` | Seller subscription plans | `seller_id` → sellers |
| 14 | `promotions` | Paid promotion slots for sellers | `seller_id` → sellers, `product_id` → products (nullable) |
| 15 | `browsing_events` | Product view tracking | `user_id` → users (nullable), `product_id` → products |
| 16 | ~~messages~~ | **REMOVED** — no direct chat feature | — |

### Detailed Schema

#### users
```sql
id            UUID        PRIMARY KEY  -- mirrors auth.users.id
email         TEXT        NOT NULL UNIQUE
full_name     TEXT
phone         TEXT
avatar_url    TEXT
role          TEXT        CHECK (role IN ('client','seller','admin')) DEFAULT 'client'
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()
```
> Note: `role = 'admin'` must be set directly in Supabase DB. Cannot be set via API.

#### sellers
```sql
id            UUID        PRIMARY KEY
user_id       UUID        FK → users.id  UNIQUE
shop_name     TEXT        NOT NULL
description   TEXT
bio           TEXT
story         TEXT        -- Markdown: artisan backstory / origin story
location      TEXT
city          TEXT
category_id   UUID        FK → categories.id
avatar_url    TEXT
is_verified   BOOLEAN     DEFAULT false
avg_rating    NUMERIC(3,2) DEFAULT 0    -- auto-updated by trigger
total_sales   NUMERIC(12,2) DEFAULT 0
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```
> Auto-verification criteria: ≥1 active product + ≥3 completed orders + avg_rating ≥ 4.0 + complete profile. Admin can override.

#### categories (9 pre-seeded)
```sql
id            UUID        PRIMARY KEY
name          TEXT        NOT NULL UNIQUE
slug          TEXT        NOT NULL UNIQUE
icon_url      TEXT
created_at    TIMESTAMPTZ
```
Pre-seeded: Jewelry · Pottery · Textiles · Paintings · Leather Goods · Candles & Soap · Food & Honey · Home Decor · Other

#### products
```sql
id              UUID        PRIMARY KEY
seller_id       UUID        FK → sellers.id
category_id     UUID        FK → categories.id
name            TEXT        NOT NULL
description     TEXT
price           NUMERIC(10,2)   -- legacy/fallback
price_min       NUMERIC(10,2)   -- minimum price range
price_max       NUMERIC(10,2)   -- maximum price range
completion_days INTEGER         -- estimated days to complete
avg_rating      NUMERIC(3,2) DEFAULT 0  -- auto-updated by trigger
view_count      INTEGER     DEFAULT 0
is_active       BOOLEAN     DEFAULT true
is_featured     BOOLEAN     DEFAULT false
is_new          BOOLEAN     DEFAULT false
fts             TSVECTOR    -- auto full-text search index
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```
> No `stock` field. This is a made-to-order platform. Products from unverified sellers are hidden from public browse.

#### orders (core feature table)
```sql
id               UUID        PRIMARY KEY
client_id        UUID        FK → users.id
seller_id        UUID        FK → sellers.id
status           TEXT        CHECK (status IN ('pending','accepted','rejected','ready','completed'))
total_amount     NUMERIC(10,2)
final_price      NUMERIC(10,2)   -- set by seller when marking READY
delivery_type    TEXT        CHECK (delivery_type IN ('fast','office_pickup','hand_to_hand'))
payment_method   TEXT        CHECK (payment_method IN ('card','cash_on_delivery'))
client_name      TEXT
client_phone     TEXT
client_address   TEXT
notes            TEXT
budget_min       NUMERIC(10,2)   -- client's stated budget range
budget_max       NUMERIC(10,2)
deadline         DATE            -- client's requested deadline
reference_images TEXT[]          -- array of Supabase Storage URLs
rejection_reason TEXT            -- required when status = 'rejected'
is_custom        BOOLEAN     DEFAULT true
ready_at         TIMESTAMPTZ     -- when seller marked READY
completed_at     TIMESTAMPTZ     -- when client confirmed COMPLETED
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

**Valid Status Transitions (enforced in `order.service.js`):**
```
pending   → accepted | rejected
accepted  → ready
ready     → completed
rejected  → (terminal — no further transitions)
completed → (terminal — no further transitions)
```

#### notifications
```sql
id            UUID        PRIMARY KEY
user_id       UUID        FK → users.id
type          TEXT        CHECK (type IN (
                            'new_order',
                            'order_accepted',
                            'order_rejected',
                            'order_ready',
                            'order_completed',
                            'system'
                          ))
title         TEXT        NOT NULL
body          TEXT
is_read       BOOLEAN     DEFAULT false
meta          JSONB       DEFAULT '{}'  -- e.g., { order_id: "...", amount: 1500 }
created_at    TIMESTAMPTZ
```

#### promotions
```sql
id                UUID        PRIMARY KEY
seller_id         UUID        FK → sellers.id
product_id        UUID        FK → products.id  -- NULL = seller-level promotion
placement         TEXT        CHECK (placement IN ('hero','browse'))
status            TEXT        CHECK (status IN ('pending','active','expired','rejected')) DEFAULT 'pending'
requested_days    INTEGER     DEFAULT 7
rejection_reason  TEXT
starts_at         TIMESTAMPTZ
ends_at           TIMESTAMPTZ
is_active         BOOLEAN     DEFAULT false
stripe_pi         TEXT        -- reserved for future real payment integration
created_at        TIMESTAMPTZ
```

### Database Triggers

| Trigger | Table | Event | Effect |
|---------|-------|-------|--------|
| `on_auth_user_created` | `auth.users` | INSERT | Auto-creates row in `public.users` |
| `trg_product_avg_rating` | `reviews` | INSERT/UPDATE/DELETE | Recalculates `products.avg_rating` |
| `trg_seller_avg_rating` | `ratings` | INSERT/UPDATE/DELETE | Recalculates `sellers.avg_rating` |
| `trg_seller_subscription` | `sellers` | INSERT | Auto-creates free `subscriptions` row |

---

## 4. Backend Documentation

### Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.js              ← validates all env vars on startup, exits if invalid
│   │   └── supabase.js         ← exports supabasePublic (ANON) + supabaseAdmin (SERVICE ROLE)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── category.controller.js
│   │   ├── product.controller.js
│   │   ├── order.controller.js
│   │   ├── seller.controller.js
│   │   ├── review.controller.js
│   │   ├── upload.controller.js
│   │   ├── wishlist.controller.js
│   │   ├── notification.controller.js
│   │   ├── clientRating.controller.js
│   │   ├── chatbot.controller.js
│   │   ├── promotion.controller.js
│   │   └── admin.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── category.routes.js
│   │   ├── product.routes.js
│   │   ├── order.routes.js
│   │   ├── seller.routes.js
│   │   ├── review.routes.js
│   │   ├── upload.routes.js
│   │   ├── wishlist.routes.js
│   │   ├── notification.routes.js
│   │   ├── clientRating.routes.js
│   │   ├── chatbot.routes.js
│   │   ├── promotion.routes.js
│   │   ├── admin.routes.js
│   │   └── user.routes.js
│   ├── services/
│   │   ├── auth.service.js         ← OTP generation, registration, login, password reset
│   │   ├── category.service.js
│   │   ├── product.service.js      ← browse (with is_verified filter), CRUD, FTS
│   │   ├── order.service.js        ← full order lifecycle + VALID_TRANSITIONS enforcement
│   │   ├── seller.service.js       ← profile CRUD, analytics, verification status
│   │   ├── review.service.js       ← product reviews + seller ratings
│   │   ├── upload.service.js       ← Supabase Storage upload (type + magic bytes validation)
│   │   ├── wishlist.service.js
│   │   ├── notification.service.js ← createNotification() helper used by other services
│   │   ├── clientRating.service.js ← seller rates client after completion
│   │   ├── chatbot.service.js      ← Gemini 1.5 Flash API call with system prompt
│   │   ├── promotion.service.js    ← hero/browse ads, request/approve/reject flow
│   │   ├── admin.service.js        ← admin-only queries: stats, user management, promotion management
│   │   └── verification.service.js ← auto-verify seller when criteria met (fire-and-forget)
│   ├── middlewares/
│   │   ├── auth.middleware.js      ← authenticate + optionalAuthenticate
│   │   ├── role.middleware.js      ← requireRole('seller'|'admin'|'client')
│   │   ├── validate.middleware.js  ← validate(schema) + validateQuery(schema)
│   │   └── error.middleware.js     ← AppError class + global errorHandler
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── product.validator.js
│   │   ├── order.validator.js
│   │   ├── seller.validator.js
│   │   ├── review.validator.js
│   │   ├── clientRating.validator.js
│   │   ├── chatbot.validator.js
│   │   └── promotion.validator.js
│   ├── utils/
│   │   ├── logger.js           ← Winston: file (error.log, combined.log) + console
│   │   └── response.js         ← success(res, data, message, statusCode) + error(...)
│   ├── app.js                  ← Express app + all middleware + route registration
│   └── server.js               ← Entry point: env validation → Supabase ping → listen
├── logs/
│   ├── error.log
│   └── combined.log
├── .env
├── .env.example
└── package.json
```

### Middleware Stack (app.js — in order)

```
1. helmet()              → 15 secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
2. cors(corsOptions)     → whitelist: CLIENT_URL + localhost (dev only). Requests with no Origin allowed.
3. hpp()                 → HTTP parameter pollution protection
4. compression()         → gzip all responses
5. express.json({limit:'100kb'})  → parse JSON body
6. morgan('combined')    → HTTP request logging → Winston
7. globalLimiter         → 100 req / 15min / IP (all routes)
8. authLimiter           → 10 req / 15min / IP (/auth/* routes only)
────── Route handlers ──────
9. authenticate          → verify JWT → attach req.user (protected routes)
10. requireRole()        → check role (role-protected routes)
11. validate()           → run Zod schema → set req.validated
12. controller           → handle request, call service
────── After routes ──────
13. notFound handler     → returns 404 JSON for unknown routes
14. errorHandler         → converts AppError/ZodError/PostgresError → JSON response
```

### Key Services Reference

#### `auth.service.js`
- **`register(body)`**: Creates user in Supabase Auth + `users` table. If `AUTH_OTP_ENABLED=true`, generates 6-digit OTP (crypto.randomInt), hashes with SHA256, stores in `otp_sessions` table (10-min TTL), sends via SMTP.
- **`verifyOtp(email, code)`**: Looks up session, timing-safe comparison, increments attempts on fail (max 5), deletes session on success, calls `supabaseAdmin.auth.admin.updateUserById(..., { email_confirm: true })`.
- **`login(email, password)`**: Supabase Auth signInWithPassword. Throws 403 if `email_confirmed_at` is null (OTP not verified).
- **`forgotPassword(email)`**: Generates 32-byte hex token, stores SHA256 hash in `password_reset_tokens` (15-min TTL), sends link to `CLIENT_URL/reset-password?token=...`.
- **`resetPassword(token, newPassword)`**: Timing-safe lookup, validates TTL, calls Supabase Auth admin to update password, deletes token.

#### `order.service.js`
- **`VALID_TRANSITIONS`**: `{ pending: ['accepted','rejected'], accepted: ['ready'], ready: ['completed'], rejected: [], completed: [] }` — enforced on every status change.
- **`createOrder(user, body)`**: Validates all items belong to same seller. Verifies seller has `is_verified=true`. Creates order + items atomically (with rollback if items fail). Notifies seller.
- **`updateStatus(orderId, newStatus, userId, extra)`**: Validates transition, checks seller ownership for accept/reject. Sets `rejection_reason` for rejected. Notifies client.
- **`markReady(orderId, userId, { final_price, delivery_type })`**: Seller-only. Transitions accepted→ready. Sets `final_price + ready_at`. Notifies client.
- **`confirmComplete(orderId, userId)`**: Checks `order.client_id === userId` (ownership, not role). Transitions ready→completed. Sets `completed_at`. Notifies seller. Calls `updateVerificationStatus()` fire-and-forget.

#### `verification.service.js`
- Auto-verifies seller when: ≥1 active product + ≥3 completed orders + avg_rating ≥ 4.0 + complete profile (shop_name + city + description all set).
- `adminOverride` guard: if admin has ever explicitly set `is_verified` (true OR false), auto-verification is permanently blocked for that seller.
- Entire function wrapped in try-catch. Never throws. Called fire-and-forget from `confirmComplete()`.

### Complete API Reference

#### Auth (`/api/v1/auth`)

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/register` | — | `email, password, full_name, role?` | Create account. If OTP enabled: sends OTP email, returns `{ requires_otp: true }` |
| POST | `/verify-otp` | — | `email, code` | Verify OTP (6-digit). Max 5 attempts. 10-min TTL. |
| POST | `/login` | — | `email, password` | Login. Throws 403 if email not confirmed. |
| POST | `/refresh` | — | — | Refresh access token |
| GET | `/me` | ✓ | — | Get current user profile |
| PUT | `/me` | ✓ | `full_name?, phone?, avatar_url?` | Update profile |
| POST | `/logout` | ✓ | — | Logout |
| POST | `/change-password` | ✓ | `current_password, new_password` | Change password |
| POST | `/forgot-password` | — | `email` | Send reset link (rate-limited: 5/15min) |
| POST | `/reset-password` | — | `token, new_password` | Reset with token (15-min TTL) |

#### Products (`/api/v1/products`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | optional | Browse public products. Query: `?search=&category_id=&min_price=&max_price=&sort=&page=&limit=` |
| GET | `/my-products` | seller | Own products (all, including inactive) |
| GET | `/:id` | optional | Product detail + images + seller info |
| POST | `/` | seller | Create product with images |
| PUT | `/:id` | seller | Update own product |
| DELETE | `/:id` | seller | Delete own product |

#### Orders (`/api/v1/orders`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/` | ✓ | any | Create custom order |
| GET | `/` | ✓ | any | List orders (auto-scoped: client sees own, seller sees incoming) |
| GET | `/:id` | ✓ | any | Order detail (ownership enforced) |
| PATCH | `/:id/status` | ✓ | seller | Accept or reject (sets `rejection_reason` if rejected) |
| PATCH | `/:id/ready` | ✓ | seller | Mark ready + set `final_price` + `delivery_type` |
| PATCH | `/:id/complete` | ✓ | any | Confirm completion (ownership: client_id must match) |

#### Sellers (`/api/v1/sellers`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | — | — | Browse verified sellers |
| GET | `/me` | ✓ | seller | Own full profile |
| GET | `/me/verification-status` | ✓ | seller | Check auto-verification progress |
| GET | `/analytics` | ✓ | seller | Shop stats + top products |
| POST | `/` | ✓ | seller | Create shop profile |
| PUT | `/:id` | ✓ | seller | Update own shop |
| PATCH | `/:id/verify` | ✓ | admin | Set is_verified true/false |
| GET | `/:id` | — | — | Public seller profile |

#### Admin (`/api/v1/admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List users (paginated, filter by role, search by name/email) |
| GET | `/products` | List ALL products including inactive |
| GET | `/stats` | Platform stats: user/product/order counts, revenue, top 5 sellers/products |
| PATCH | `/sellers/:id/verify` | Set is_verified true/false |
| DELETE | `/products/:id` | Force-delete any product |
| PATCH | `/users/:id/role` | Change role to client or seller (cannot set admin) |
| GET | `/promotions` | List promotion requests (paginated, filter by status) |
| PATCH | `/promotions/:id/activate` | Activate promotion (sets starts_at=NOW, ends_at=NOW+requested_days) |
| PATCH | `/promotions/:id/reject` | Reject with reason |

### Error Response Format

```json
// Validation error (400)
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "budget_min", "message": "Number must be positive" }
  ]
}

// Auth error (401)
{ "success": false, "message": "Authentication required" }

// Permission error (403)
{ "success": false, "message": "Forbidden: seller role required" }

// Not found (404)
{ "success": false, "message": "Order not found" }

// Conflict (409)
{ "success": false, "message": "You have already reviewed this product" }

// Rate limit (429)
{ "success": false, "message": "Too many requests" }

// Server error — production (500)
{ "success": false, "message": "Internal server error" }

// Server error — development (500, includes stack trace)
{ "success": false, "message": "...", "stack": "Error: ...\n  at ..." }
```

---

## 5. Frontend Documentation

### Folder Structure

```
frontend/
├── index.html              ← Google Fonts: Plus Jakarta Sans + Readex Pro + Amiri + Inter
├── vite.config.js
├── tailwind.config.js      ← custom colors: cream/beige/sage/warm/brick + shadows + animations
├── src/
│   ├── main.jsx            ← React entry point, i18n init, Router
│   ├── App.jsx             ← Route tree via router/index.jsx
│   ├── index.css           ← Tailwind directives + component classes + animation system
│   ├── router/
│   │   └── index.jsx       ← All routes + guards: RequireAuth, RequireSeller, RequireAdmin, GuestOnly
│   ├── context/
│   │   ├── AuthContext.jsx ← User session state, login/logout actions
│   │   └── CartContext.jsx ← STUB (empty — no cart feature, custom-order platform)
│   ├── hooks/
│   │   └── useInView.js    ← IntersectionObserver fire-once hook → [ref, isInView]
│   ├── services/
│   │   └── api.js          ← Axios instance + interceptors + all API methods
│   ├── i18n/
│   │   ├── index.jsx       ← React-i18next init + custom useTranslation hook (adds lang, setLang, isRTL)
│   │   └── locales/
│   │       ├── ar.json     ← Arabic (default, ~1200 keys)
│   │       ├── en.json     ← English (~1200 keys, full parity with ar)
│   │       └── fr.json     ← French (~46% complete)
│   ├── utils/
│   │   ├── formatPrice.js  ← formatPrice, formatPriceRange, formatDeadline, formatRelativeTime
│   │   └── validation.js   ← Frontend form validation helpers
│   ├── pages/
│   │   ├── HomePage.jsx            ← Split-screen hero + HowItWorks + FeaturedProducts + scroll reveals
│   │   ├── BrowsePage.jsx          ← Product grid with filters + pagination
│   │   ├── ProductPage.jsx         ← Product detail + reviews + order form trigger
│   │   ├── SellerPage.jsx          ← Public seller profile + their products
│   │   ├── NotificationsPage.jsx   ← Notification list with mark-read
│   │   ├── NotFoundPage.jsx        ← 404 page
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── OtpVerifyPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   └── ResetPasswordPage.jsx
│   │   ├── client/
│   │   │   ├── ClientDashboardPage.jsx
│   │   │   ├── ClientOrdersPage.jsx
│   │   │   ├── ClientOrderDetailPage.jsx
│   │   │   ├── ClientProfilePage.jsx
│   │   │   └── WishlistPage.jsx
│   │   ├── seller/
│   │   │   ├── SellerDashboardPage.jsx   ← analytics + verification status + activation banner
│   │   │   ├── SellerProductsPage.jsx    ← product CRUD + unverified warning
│   │   │   ├── SellerOrdersPage.jsx      ← incoming orders management
│   │   │   ├── SellerOrderDetailPage.jsx ← accept/reject/mark-ready flow
│   │   │   ├── SellerProfilePage.jsx     ← edit shop info
│   │   │   └── SellerPromotionsPage.jsx  ← promotion requests + status
│   │   └── admin/
│   │       ├── AdminDashboardPage.jsx    ← platform stats
│   │       ├── AdminUsersPage.jsx        ← user list + role changes
│   │       ├── AdminProductsPage.jsx     ← all products + force delete
│   │       ├── AdminSellersPage.jsx      ← seller verification controls
│   │       ├── AdminCategoriesPage.jsx   ← category CRUD
│   │       └── AdminPromotionsPage.jsx   ← approve/reject promotion requests
│   └── components/
│       ├── layout/
│       │   ├── MainLayout.jsx       ← Wraps all pages, renders TopBar + BottomNav + content
│       │   ├── TopBar.jsx           ← Logo + search + language switcher + auth buttons (desktop)
│       │   ├── BottomNav.jsx        ← Mobile pill navigation (5 tabs with active expand animation)
│       │   └── DesktopNav.jsx       ← Sidebar nav for seller/admin dashboards
│       ├── product/
│       │   └── ProductCard.jsx      ← Product card with hover-lift + wishlist toggle (heart beat)
│       ├── order/
│       │   ├── CustomOrderForm.jsx  ← Full order submission form (global modal, triggered from any page)
│       │   ├── OrderCard.jsx        ← Order summary card with status badge
│       │   └── OrderStatusBadge.jsx ← STUB (empty — inline status badges used instead)
│       ├── ErrorBoundary.jsx        ← React error boundary (logs in dev, shows fallback UI)
│       └── ChatbotWidget.jsx        ← Floating AI assistant button + chat panel
```

### Route Architecture

```
/                     → HomePage (public)
/browse               → BrowsePage (public)
/product/:id          → ProductPage (public)
/seller/:id           → SellerPage (public)
/login                → LoginPage (GuestOnly)
/register             → RegisterPage (GuestOnly)
/verify-otp           → OtpVerifyPage (GuestOnly)
/forgot-password      → ForgotPasswordPage (GuestOnly)
/reset-password       → ResetPasswordPage (GuestOnly)
/notifications        → NotificationsPage (RequireAuth + RequireNotAdmin)
/wishlist             → WishlistPage (RequireAuth + RequireNotAdmin)
/client/dashboard     → ClientDashboardPage (RequireAuth)
/client/orders        → ClientOrdersPage (RequireAuth)
/client/orders/:id    → ClientOrderDetailPage (RequireAuth)
/client/:id           → ClientProfilePage (RequireAuth)
/seller/dashboard     → SellerDashboardPage (RequireSeller)
/seller/products      → SellerProductsPage (RequireSeller)
/seller/orders        → SellerOrdersPage (RequireSeller)
/seller/orders/:id    → SellerOrderDetailPage (RequireSeller)
/seller/profile       → SellerProfilePage (RequireSeller)
/seller/promotions    → SellerPromotionsPage (RequireSeller)
/admin                → AdminDashboardPage (RequireAdmin)
/admin/users          → AdminUsersPage (RequireAdmin)
/admin/products       → AdminProductsPage (RequireAdmin)
/admin/sellers        → AdminSellersPage (RequireAdmin)
/admin/categories     → AdminCategoriesPage (RequireAdmin)
/admin/promotions     → AdminPromotionsPage (RequireAdmin)
```

**Route Guards:**
- `RequireAuth` — redirects to `/login` if not authenticated
- `RequireSeller` — redirects admin to `/admin`, non-seller to `/login`
- `RequireAdmin` — redirects non-admin to home
- `GuestOnly` — redirects authenticated users to home
- `RequireNotAdmin` — prevents admin from accessing client/seller-specific pages

### API Service Layer (`api.js`)

The Axios instance is configured with:
- `baseURL = import.meta.env.VITE_API_URL` (defaults to localhost — see issue H-4)
- Request interceptor: attaches `Authorization: Bearer {token}` from localStorage
- Response interceptor: handles 401 → token refresh → retry queue

Available API modules:
```js
authAPI           // register, verifyOtp, login, logout, me, updateMe, changePassword, forgotPassword, resetPassword
productsAPI       // getAll, getById, getMyProducts, create, update, delete
ordersAPI         // create, getAll, getById, updateStatus, markReady, confirmComplete
usersAPI          // getProfile, updateProfile
clientRatingsAPI  // rateClient, getClientRatings
categoriesAPI     // getAll, getById, getBySlug, create, update, delete
sellersAPI        // getAll, getById, getMe, getAnalytics, create, update, getVerificationStatus
reviewsAPI        // getProductReviews, createProductReview, deleteReview, getSellerRatings, rateSellerAfterOrder
wishlistAPI       // getWishlist, addToWishlist, removeFromWishlist, checkWishlist
notificationsAPI  // getAll, getUnreadCount, markRead, markAllRead, delete
uploadsAPI        // uploadImage, uploadImages
chatbotAPI        // sendMessage(message, conversation_history)
promotionsAPI     // getHeroAds, getBrowseAds, requestPromotion, getMyPromotion, getFeaturedProducts
adminAPI          // getUsers, getProducts, getStats, verifySeller, deleteProduct, updateUserRole,
                  // getPromotions, activatePromotion, rejectPromotion
```

---

## 6. Key Features In Depth

### 6.1 Custom Order System

The central feature of Hirftna. Replaces direct chat entirely.

**Client Flow:**
1. Browse products → click "Order Custom Piece"
2. `CustomOrderForm` (global modal) opens with:
   - Product reference (pre-filled)
   - Budget range (min/max in DA)
   - Deadline date
   - Reference images (upload up to 5)
   - Delivery type (fast / office pickup / hand-to-hand)
   - Payment method (card / cash on delivery)
   - Notes (detailed description of request)
3. Submit → `POST /api/v1/orders` → order created with status `pending`
4. Real-time notification sent to seller

**Seller Flow:**
1. `SellerOrdersPage` shows incoming pending orders
2. View order detail → see client's request, budget, deadline, reference images
3. Accept (status → `accepted`) or Reject with mandatory reason (status → `rejected`)
4. Work on the piece
5. When ready: mark as Ready → set `final_price` + confirm delivery method (status → `ready`)
6. Client receives notification to confirm

**Client Completion:**
1. Client views final_price + delivery method on `ClientOrderDetailPage`
2. If satisfied: click Confirm → `PATCH /orders/:id/complete` → status → `completed`
3. Both sides unlock rating options

### 6.2 Two-Factor Authentication (2FA)

Registration-only OTP flow:

```
Register with email+password
  → backend creates Supabase Auth user (email_confirmed = false)
  → generates 6-digit OTP (crypto.randomInt — CSPRNG)
  → hashes OTP with SHA256, stores in otp_sessions table
  → sends OTP to email via SMTP (nodemailer)
  → frontend receives { requires_otp: true, email }
  → redirects to /verify-otp

User enters code
  → POST /auth/verify-otp { email, code }
  → backend fetches session, purges expired
  → timing-safe comparison (crypto.timingSafeEqual prevents timing attacks)
  → on match: delete session, call supabaseAdmin to set email_confirmed = true
  → on fail: increment attempt count (max 5 → session locked)
  → return token on success

Login: no OTP required
  → POST /auth/login
  → Supabase signInWithPassword
  → throws 403 if email_confirmed_at is null (unverified)
```

### 6.3 AI Chatbot (Google Gemini)

- **Model:** Gemini 1.5 Flash (free tier)
- **Rate limit:** 20 requests/hour per user
- **Interface:** Floating widget (`ChatbotWidget.jsx`) — available on all pages
- **System prompt:** Artisan marketplace context, responds about Hirftna features and products
- **History:** Client sends `conversation_history[]` (max 20 entries, roles: `user` | `assistant`)
- **Backend proxy:** Frontend never talks to Gemini directly — goes through Express backend

### 6.4 Seller Verification System

Two-path verification:
1. **Manual (admin):** Admin uses `PATCH /admin/sellers/:id/verify` → immediate
2. **Automatic:** `verification.service.js` called after each `confirmComplete()`

Auto-verification criteria (ALL must be true):
- `is_active` products ≥ 1
- Completed orders ≥ 3
- `avg_rating` ≥ 4.0
- Profile complete: `shop_name` + `city` + `description` all set

Admin override: if admin has ever explicitly set `is_verified` to any value, auto-verification never overrides that decision.

**Visibility rule:** Products from unverified sellers are hidden from `GET /products` and `GET /products/:id` for non-admin users. Sellers still see their own products via `GET /products/my-products`.

### 6.5 Promotion System

Sellers can request promotional placements:
- **Hero placement**: Large featured banner on HomePage
- **Browse placement**: Featured grid section on BrowsePage

**Flow:**
1. Seller submits request: `POST /api/v1/promotions/request` (with placement type + product_id optional + requested_days)
2. Admin reviews in `AdminPromotionsPage`
3. Admin activates: sets `is_active=true`, `starts_at=NOW()`, `ends_at=NOW()+requested_days`
4. Admin rejects: sets `rejection_reason`
5. Expired promotions: `ends_at < NOW()` → not returned by public endpoints

**Payment:** For MVP, payment to platform is simulated (`setTimeout 2s`). Real Chargily integration is the next step.

### 6.6 Payment System (Chargily — Simulated)

Hirftna uses Chargily for Algerian payment processing. **For MVP, card payment is simulated.**

Two distinct payment components:
- `PaymentModal.jsx` — Seller pays platform activation fee (CCP transfer)
- `PaymentStep.jsx` — Client pays seller for order completion

Card payment simulation:
```js
// MVP: simulate payment processing
await new Promise(resolve => setTimeout(resolve, 2000));
// Shows progress UI → success message
// Production: replace with real Chargily API call
```

Payment methods supported: card (Chargily, simulated) + cash on delivery (no processing needed).

### 6.7 Wishlist

Available to ALL authenticated users (clients AND sellers). No "cart" concept exists — this is a made-to-order platform.

- Toggle: add/remove with heart icon (heartBeat animation on add)
- Check state: `GET /wishlist/:product_id/check` — used by ProductCard to show filled heart
- Paginated list: `WishlistPage.jsx`

### 6.8 Mutual Rating System

After an order reaches `completed` status:
- **Client rates Seller (product review):** `POST /reviews/product` → linked to `product_id` + triggers `products.avg_rating` recalculation
- **Client rates Seller (seller rating):** `POST /reviews/seller` → linked to `seller_id` + triggers `sellers.avg_rating` recalculation
- **Seller rates Client:** `POST /client-ratings` → linked to `order_id` (one per order, unique constraint)

Ratings are only allowed after `order.status = 'completed'`. Uniqueness enforced at DB level.

### 6.9 Admin Panel

Full platform management at `/admin`:
- **Dashboard:** Total users/products/orders/revenue, top 5 sellers by sales, top 5 products by views
- **Users:** Search/filter users by role, change roles (client ↔ seller)
- **Products:** View all products (active + inactive), force-delete any product
- **Sellers:** Set `is_verified` true/false (with activation notification sent)
- **Categories:** Full CRUD
- **Promotions:** Approve or reject pending promotion requests

> Admin role must be set directly in Supabase DB — cannot be assigned via API.

---

## 7. Design System

### Color Palette

| Name | Hex (primary) | Usage |
|------|--------------|-------|
| `cream-100` | `#FDF9F3` | Default background (body) |
| `cream-300` | `#F5ECD8` | Secondary backgrounds, skeleton loaders |
| `beige-300` | `#E2CFB2` | Borders, input borders |
| `sage-500` | `#728C67` | Primary CTA buttons, active states, focus rings |
| `sage-600` | `#5C7253` | Button hover |
| `warm-800` | `#35322A` | Primary text |
| `warm-500` | `#8C8878` | Secondary text, placeholders |
| `brick-500` | `#8B3A2A` | Accent (notifications badge, warnings, special badges) |
| `success` | `#5C8A4A` | Success states |
| `warning` | `#C4862A` | Warning badges (pending orders, etc.) |
| `danger` | `#C0443A` | Error states, destructive actions |
| `info` | `#3A6EA8` | Info states |

### Typography

| Family | Purpose | Weights |
|--------|---------|---------|
| Plus Jakarta Sans | LTR body text, UI labels | 400, 500, 600, 700, 800 |
| Readex Pro | RTL Arabic body text | 400, 500, 600, 700 |
| Amiri | Logo Arabic text "حرفتنا" | 400, 700 |
| Inter | Logo Latin "MARKETPLACE" | 500, 600, 700 |

The `[dir="rtl"]` CSS rule automatically switches to Readex Pro as the primary font for Arabic.

### Component Classes (`index.css`)

```css
.btn              /* Base button: flex + gap + padding + radius + transition */
.btn-primary      /* sage-500 background, white text */
.btn-secondary    /* cream-300 background */
.btn-outline      /* Transparent with sage border */
.btn-ghost        /* Transparent, hover cream */
.btn-danger       /* danger background */
.btn-sm / .btn-lg /* Size modifiers */

.card             /* White, rounded-3xl, shadow-soft, cream border */
.card-hover       /* card + hover:shadow-soft-md */
.card-flat        /* cream-100 background, no shadow */

.input            /* Full-width, cream-100 bg, beige border, sage focus ring */
.input-error      /* danger border tint */

.badge            /* Pill shape */
.badge-sage / .badge-cream / .badge-success / .badge-warning / .badge-danger / .badge-info

.skeleton         /* Animated gradient placeholder */
```

### Animation System

```css
/* Entrance animations */
.animate-fade-in-up     /* 500ms cubic-bezier */
.animate-fade-in-down   /* 300ms */
.animate-fade-in-left   /* 500ms */
.animate-fade-in-right  /* 500ms */
.animate-heart-beat     /* 300ms — used on wishlist toggle */

/* Stagger delays */
.delay-75 / .delay-100 / .delay-150 / .delay-200 / .delay-300 / .delay-400 / .delay-500

/* Scroll-triggered (via IntersectionObserver + useInView hook) */
.reveal           /* Start: opacity:0, translateY(20px) */
.reveal.in-view   /* End: opacity:1, translateY(0) */

/* Hover */
.hover-lift       /* translateY(-4px) + deeper shadow on hover */
```

RTL support: `[dir="rtl"] .animate-fade-in-left` uses `fadeInRight` keyframe (direction swapped).

Accessibility: `@media (prefers-reduced-motion: reduce)` disables all animations.

### Bottom Navigation (Mobile)

The floating pill navigation uses CSS transitions for the label expand/collapse effect:

```css
.pill-nav-tab          /* collapsed: 42px × 42px, icon only */
.pill-nav-tab.active   /* expanded: wider pill with label visible */
.pill-nav-tab-label    /* max-width: 0 → 6rem on active (CSS transition) */
```

---

## 8. Security Model

### Defense In Depth

```
Layer 1 — Network:  HTTPS only (enforced by Vercel + Render)
Layer 2 — Headers:  helmet() — 15 secure headers including HSTS, CSP, X-Frame-Options
Layer 3 — CORS:     Whitelist of known origins (CLIENT_URL + localhost in dev)
Layer 4 — Rate limiting: Global 100/15min, Auth 10/15min, Chatbot 20/hr, Upload 10/hr
Layer 5 — Input:    HPP protection + Zod validation on all POST/PUT/PATCH + size limits
Layer 6 — Auth:     JWT via Supabase Auth (cryptographically signed, server-verified)
Layer 7 — AuthZ:    Role-based middleware (requireRole) + ownership checks in services
Layer 8 — Data:     Parameterized queries via Supabase SDK (no SQL injection surface)
Layer 9 — Secrets:  No secrets in frontend code; SERVICE_ROLE key backend-only
Layer 10 — Errors:  Stack traces suppressed in production responses
```

### JWT Flow

1. User logs in → Supabase Auth returns access + refresh tokens
2. Tokens stored in localStorage (frontend)
3. Every API request: `Authorization: Bearer {accessToken}`
4. Backend: `supabasePublic.auth.getUser(token)` verifies JWT signature
5. User data fetched from `public.users` table via `supabaseAdmin`
6. On 401: frontend automatically refreshes token → retries request
7. On refresh failure: session cleared → user redirected to `/login`

### OTP Security

- Codes generated with `crypto.randomInt` (CSPRNG — not `Math.random`)
- Stored as SHA256 hash (plaintext OTP never written to DB)
- Comparison via `crypto.timingSafeEqual` (prevents timing attacks)
- 10-minute TTL enforced at DB level
- Max 5 attempts per session (brute-force protection)
- Sessions purged on expiry, success, or max-attempts

### Upload Security

- File type validation: MIME type + file extension + magic bytes checked
- Max file size: 5MB per image
- Files stored in Supabase Storage (public buckets: `product-images`, `avatars`)
- Uploaded to Supabase directly from backend (never stored on Render disk)

---

## 9. Internationalization (i18n)

### Implementation

Uses **React-i18next** (not a custom hook). Entry point: `frontend/src/i18n/index.jsx`.

```js
// Custom useTranslation() returns:
const { t, i18n, lang, setLang, isRTL } = useTranslation();

// setLang() does three things:
// 1. i18n.changeLanguage(lang)
// 2. document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
// 3. document.documentElement.lang = lang
// 4. localStorage.setItem('lang', lang)
```

### Language Support

| Language | Code | Status | Direction |
|----------|------|--------|-----------|
| Arabic | `ar` | Full (default) | RTL |
| English | `en` | Full | LTR |
| French | `fr` | ~46% complete | LTR |

### Translation File Structure (`ar.json` / `en.json` — ~1200 keys each)

```json
{
  "common": { "save", "cancel", "delete", "loading", "error", "from", ... },
  "nav": { "home", "browse", "wishlist", "orders", "notifications", ... },
  "auth": { "login", "register", "logout", "email", "password", ... },
  "product": { "title", "description", "price", "addToWishlist", ... },
  "order": {
    "status": { "pending", "accepted", "rejected", "completed" },  // ⚠️ missing "ready"
    "form": { ... },
    "deadline": { ... }
  },
  "orders": {
    "statuses": { "pending", "accepted", "rejected", "ready", "completed" },
    "seller": { ... }
  },
  "seller": { ... },
  "sellerOrders": { ... },  // ⚠️ duplicate of orders.seller.*
  "notifications": { "types": { "new_order", "order_accepted", ... } },
  "categories": { ... },
  "admin": { ... },
  "language": { "arabic", "english", "french" },
  "payment": { ... }
}
```

### RTL Behavior

When language is `ar`:
- `document.dir = "rtl"` → browser reverses flex directions, text alignment, margins
- CSS `[dir="rtl"]` selector applies Readex Pro font
- `[dir="rtl"] .animate-fade-in-left` → uses `fadeInRight` keyframe (direction swapped)
- TailwindCSS logical properties (`ms-`, `me-`, `ps-`, `pe-`) respect RTL automatically

---

## 10. Development Journey

The project was built in 19 phases over approximately 1 month, following a strict bottom-up architecture:

| Phase | What Was Built |
|-------|---------------|
| 1 | Foundation: project structure, logger, response util, env validation, Supabase clients, error/validate/auth/role middlewares, app.js, server.js |
| 2 | Authentication: OTP 2FA via email, register/login/logout/refresh/me/update, Zod validators |
| 3 | Categories: full CRUD, admin-protected writes, public reads |
| 4 | Products: browse with full-text search + filters + pagination, CRUD, seller-scoped, verified-only public view |
| 5 | File Uploads: Supabase Storage, type/magic bytes/size validation, multi-image support |
| 6 | Sellers: shop profiles, analytics, public browse, admin verification endpoint |
| 7 | Orders: full custom order lifecycle (pending→accepted→rejected→ready→completed), notifications |
| 8 | Reviews & Ratings: product reviews + seller ratings, uniqueness enforced, avg recalc triggers |
| 9 | Wishlist: add/remove/check for all authenticated users |
| 10 | Notifications: in-app notifications with type system, mark-read, unread count |
| 11 | Client Ratings: sellers rate clients after order completion, public client reputation |
| 12 | AI Chatbot: Gemini 1.5 Flash backend proxy, conversation history, rate limiting |
| 13 | Admin Panel: user/product/seller/stats management, promotion management |
| 14 | Auth Polish: forgot/reset password, OTP moved to registration-only |
| 15 | Payments: Chargily frontend integration (simulated for MVP) |
| 16 | Seller Activation: verified seller filter on all public product queries, activation banners |
| 17 | Promotions Backend: hero/browse placement system, admin approve/reject workflow |
| 18 | Homepage Redesign: split-screen hero, animation system, scroll reveals, IntersectionObserver |
| 19 | Payment Modal: PaymentModal + PaymentStep components, ErrorBoundary, i18n payment keys, Amiri font |

---

## 11. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (numeric) |
| `NODE_ENV` | Yes | `development` / `production` / `test` |
| `SUPABASE_URL` | Yes | Must start with `https://` |
| `SUPABASE_ANON_KEY` | Yes | Publishable key (for auth verification) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Secret key (for DB queries) — never expose to frontend |
| `CLIENT_URL` | Yes | Frontend URL (https or localhost) — used for CORS + reset password links |
| `JWT_SECRET` | Yes | Minimum 32 characters |
| `AUTH_OTP_ENABLED` | Yes | `true` / `false` — if true, SMTP vars also required |
| `SMTP_HOST` | Cond. | Required if AUTH_OTP_ENABLED=true |
| `SMTP_PORT` | Cond. | Required if AUTH_OTP_ENABLED=true |
| `SMTP_USER` | Cond. | Required if AUTH_OTP_ENABLED=true |
| `SMTP_PASS` | Cond. | Required if AUTH_OTP_ENABLED=true |
| `SMTP_FROM` | Cond. | Required if AUTH_OTP_ENABLED=true |
| `GEMINI_API_KEY` | Optional | Google Gemini API key (chatbot disabled if missing) |
| `CHARGILY_API_KEY` | Optional | Chargily payment key (payments simulated if missing) |
| `CHARGILY_SECRET` | Optional | Chargily secret |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL (e.g., `https://hirftna-api.onrender.com/api/v1`) |
| `VITE_SUPABASE_URL` | Optional | Used for Supabase Realtime (notifications) |
| `VITE_SUPABASE_ANON_KEY` | Optional | Used for Supabase Realtime |

---

## 12. Known Limitations & Future Work

### MVP Limitations (by design)

| Limitation | Reason | Future |
|------------|--------|--------|
| Card payment is simulated | Chargily integration requires production setup | Replace `setTimeout` with real Chargily API calls |
| French locale 46% complete | Time constraint | Complete translations |
| No real-time notifications (polling) | Supabase Realtime not yet wired | Wire up `supabase.channel().on('postgres_changes', ...)` |
| No push notifications | MVP scope | Add web push via Service Worker |
| No file size enforcement on frontend | Upload validated on backend only | Add client-side size check before upload |
| Admin cannot be set via API | Security: prevents privilege escalation | Admin management via Supabase dashboard |
| Promotions payment not real | MVP simulated | Integrate real Chargily payment on promotion request |

### Known Issues to Fix Before Launch

See [PRE_DEPLOYMENT_FIXES.md](./PRE_DEPLOYMENT_FIXES.md) for the full prioritized list.

The 3 critical issues are:
1. Missing `vercel.json` (all direct URLs 404)
2. Unvalidated `category_id` query parameter
3. Hardcoded "From" English text in price formatters

### Architectural Decisions (intentional)

- **No stock field on products**: Hirftna is made-to-order. Every product is crafted specifically for the buyer after order placement.
- **No direct messaging**: The Custom Order system replaces chat. This prevents spam, ghosting, and unstructured negotiation.
- **Notification body hardcoded in Arabic**: The architecture intends for frontend to translate by `notification.type`. The `body` field is a fallback.
- **OTP only at registration**: Login does not trigger OTP. This was a deliberate UX decision to reduce friction.
- **Chargily not Stripe**: Stripe does not support Algeria. Chargily is the standard Algerian payment gateway.
- **Gemini not OpenAI**: OpenAI pricing is unsuitable for a free-tier MVP. Gemini 1.5 Flash has a free tier.

---

## 13. Appendices

### A. Standard API Response Shape

```typescript
// Success
{
  success: true,
  message: string,
  data: object | array | null
}

// Success with pagination
{
  success: true,
  data: {
    items: array,
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number,
      hasNext: boolean,
      hasPrev: boolean
    }
  }
}

// Error
{
  success: false,
  message: string,
  errors?: Array<{ field: string, message: string }> | null,
  stack?: string  // development only
}
```

### B. HTTP Status Codes Used

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET/PUT/PATCH/DELETE |
| 201 | Created | Successful POST (new resource) |
| 400 | Bad Request | Zod validation failed |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Wrong role, or unverified email |
| 404 | Not Found | Resource doesn't exist (or no access) |
| 409 | Conflict | Duplicate entry (unique constraint) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unhandled exception |

### C. Third-Party Services

| Service | Purpose | Free Tier | Production |
|---------|---------|-----------|-----------|
| Supabase | Database + Auth + Storage | 500MB DB, 1GB storage | Scale as needed |
| Google Gemini 1.5 Flash | AI Chatbot | 15 req/min, 1M tokens/day | Paid above free tier |
| Chargily | Algerian Payment Gateway | N/A | Transaction fees |
| SMTP Provider | OTP + password reset emails | Gmail: 500/day | Consider Resend/Mailgun |
| Render.com | Backend hosting | Free (spins down after 15min idle) | Paid: no spin-down |
| Vercel | Frontend hosting | Free CDN + deployments | Free for most cases |

### D. Database Migrations

Migration files in `backend/migrations/`:
- `001_initial_schema.sql` — all 16 tables + initial data
- `002_auth_triggers.sql` — `on_auth_user_created`, rating triggers, subscription trigger
- `003_promotions_extend.sql` — adds `status`, `requested_days`, `rejection_reason` columns to promotions + indexes

> Run migrations in order in Supabase SQL Editor.

### E. Deployment Checklist

**Render (Backend):**
- [ ] Set all backend env vars (from section 11)
- [ ] Set `NODE_ENV=production`
- [ ] Set `CLIENT_URL` to actual Vercel domain (not localhost)
- [ ] Add `"engines": { "node": ">=20.0.0" }` to `backend/package.json`
- [ ] Verify SMTP credentials work (test OTP email)
- [ ] Run all 3 migrations in Supabase SQL Editor

**Vercel (Frontend):**
- [ ] Create `frontend/vercel.json` with SPA rewrite rule
- [ ] Set `VITE_API_URL` to Render backend URL
- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` if using Realtime
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

**Supabase:**
- [ ] Confirm `product-images` and `avatars` buckets exist and are public
- [ ] Confirm all 4 triggers are active
- [ ] Set admin user: update `role = 'admin'` directly in `public.users` table

---

*Documentation generated from 8-phase forensic codebase audit · Hirftna Marketplace MVP · 2026-05-19*
