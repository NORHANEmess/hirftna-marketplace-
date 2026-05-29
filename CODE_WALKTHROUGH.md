# Hirftna Marketplace — Complete Code Walkthrough
# Prepared for Graduation Defense (Soutenance)

---

## TABLE OF CONTENTS

- Part 1: Project Overview & Architecture
- Part 2: Backend — Configuration & Setup
- Part 3: Backend — Middleware Stack
- Part 4: Backend — Database Schema & Models
- Part 5: Backend — Services (Business Logic)
- Part 6: Backend — Controllers & Routes (API Endpoints)
- Part 7: Backend — Validators (Input Validation)
- Part 8: Frontend — App Setup & Routing
- Part 9: Frontend — State Management (AuthContext)
- Part 10: Frontend — API Service Layer
- Part 11: Frontend — Pages
- Part 12: Frontend — Components
- Part 13: Frontend — Internationalization (i18n)
- Part 14: Frontend — Styling & Design System
- Part 15: Key Workflows (End-to-End Traces)
- Part 16: Security Implementation
- Part 17: Deployment Architecture
- Part 18: Common Jury Questions & Answers

---

## PART 1: PROJECT OVERVIEW & ARCHITECTURE

### What Is Hirftna?

**Hirftna** (حرفتنا — "Our Craft" in Arabic) is an Algerian marketplace platform for handmade goods and artisan crafts. It connects artisans (sellers) with customers (clients) through a structured custom-order system.

**The Problem It Solves:** Algerian artisans have no dedicated digital platform to showcase and sell handmade goods. General e-commerce platforms don't fit the custom-order nature of handcraft (fixed stock, fixed prices). Hirftna solves this by removing the traditional cart/checkout model entirely and replacing it with a negotiation-free custom order flow where the client specifies requirements and budget, and the seller sets the final price.

### The Four User Roles

| Role | Description | Key Capability |
|------|-------------|----------------|
| **Visitor** | Unauthenticated user | Browse products, view seller profiles |
| **Client** | Registered buyer | Place custom orders, wishlist, reviews |
| **Seller** | Artisan/shop owner | Create products, manage orders, promotions |
| **Admin** | Platform administrator | Verify sellers, manage promotions, view stats |

> Note: Sellers can also act as clients — they can place orders from other sellers.

### The Core Innovation: Custom Order System

This is NOT a traditional e-commerce platform. There is no "Add to Cart" button. Instead:

1. Products show a **price range** (e.g. "500 – 2000 DA") indicating minimum and maximum possible prices
2. The primary action is **"Request Custom Order"** — the client describes what they want, sets a budget, and picks a deadline
3. The seller reviews the request, **accepts or rejects** it
4. The seller works on the product and **marks it as Ready**, setting a final price
5. The client reviews the final price and **confirms completion**
6. Both sides **rate each other**

**Why no direct messaging?** To keep the platform structured, trusted, and fraud-resistant. All communication happens through the formalized order flow — no negotiation happens outside the system.

### Technology Stack — Choices and Reasons

**Node.js + Express v5 (Backend)**
- JavaScript on both frontend and backend means one language for the whole team
- Express is minimalist — gives full control over middleware ordering
- Express v5 adds async error propagation natively (no need for try/catch wrappers)
- Large ecosystem, extensive documentation, widely known in Algeria

**React 19 + Vite (Frontend)**
- Component-based architecture — each UI piece is isolated and reusable
- Vite provides extremely fast Hot Module Replacement (HMR) during development
- React 19 includes concurrent rendering improvements
- JSX makes it easy to build complex UIs with clear component boundaries

**Supabase (Database + Auth + Storage)**
- PostgreSQL 15 database with full SQL support and joins
- Built-in authentication (email/password, JWT) so we don't need a separate auth server
- Supabase Storage for images (product images, avatars) with public CDN URLs
- Free tier is generous for an MVP; scales to paid tier without code changes
- One service replaces what would otherwise be: a database server + auth server + file server

**TailwindCSS (Styling)**
- Utility-first: no naming convention overhead (BEM, etc.)
- Responsive design with built-in breakpoints (`md:`, `lg:`)
- Consistent design tokens (colors, spacing) shared across all components
- Much faster to iterate on UI than writing custom CSS
- Custom design system extended in `tailwind.config.js` (cream, sage, beige palette)

**i18next (Internationalization)**
- Mature library with React hooks integration (`useTranslation`)
- Supports RTL text direction for Arabic
- Dynamic interpolation — `t('key', { name })` fills in variables
- Language detection from localStorage persists user preference

**Google Gemini 2.5 Flash (AI Chatbot)**
- Free API tier sufficient for MVP usage
- Strong multilingual support (Arabic, French, English)
- Faster and cheaper than GPT-4 for assistant use cases
- `gemini-2.5-flash` model — optimized for quick responses

### Architecture Diagram

```
User's Browser
     │
     │  HTTP Requests (HTTPS)
     ▼
React App (Vercel CDN)
  - Vite build (SPA)
  - React Router handles all page navigation
  - Axios sends requests with JWT token in Authorization header
     │
     │  REST API calls → https://hirftna-backend.onrender.com/api/v1
     ▼
Express API (Render — Node.js server)
  - Middleware stack: helmet → CORS → hpp → body parser → rate limiter
  - auth.middleware.js verifies JWT with Supabase
  - route → controller → service
  - Services use supabaseAdmin to query database
     │
     │  PostgreSQL queries + Storage + Auth verification
     ▼
Supabase (EU West cloud)
  - PostgreSQL 15 database (all tables)
  - Auth service (manages user accounts + JWT tokens)
  - Storage buckets (product-images, avatars)
```

### Request/Response Cycle

1. User performs an action in the React app (e.g. clicks "Accept Order")
2. React calls `ordersAPI.updateStatus(id, { status: 'accepted' })` in `api.js`
3. Axios sends `PATCH /api/v1/orders/:id/status` with `Authorization: Bearer <token>`
4. Express receives the request; **helmet** adds security headers; **cors** validates origin
5. **authLimiter** rate limiter checks request count; **globalLimiter** also checks
6. `authenticate` middleware reads the `Authorization` header, extracts the JWT
7. Supabase verifies the JWT; user profile is loaded from `public.users` table
8. `requireRole('seller')` verifies user has the seller role
9. `validate({ body })` runs Zod schema on the request body
10. `order.controller.js` extracts validated data, calls `order.service.updateOrderStatus()`
11. Service queries Supabase via `supabaseAdmin`, validates the status transition, updates the row
12. Notification is created for the client in the `notifications` table
13. Service returns the updated order object
14. Controller calls `sendSuccess(res, data, 'Order updated')` — response format: `{ success: true, message, data }`
15. React component receives the response, updates state, and re-renders

---

## PART 2: BACKEND — CONFIGURATION & SETUP

### `backend/src/server.js` — Entry Point

This is the file Node.js executes when the server starts (`node src/server.js`).

**Line-by-line explanation:**

```
Line 7:   require('dotenv').config()  — loads .env file into process.env FIRST
Line 9:   validateEnv()               — validates all required env vars exist
Line 17:  validateEnv() call          — exits process if anything is missing
Line 22:  PORT = parseInt(process.env.PORT, 10) || 4000
Line 24:  app.listen(PORT, async callback)  — starts HTTP server
Line 31:  testConnection()            — verifies Supabase is reachable
```

The `shutdown(signal)` function (line 44) handles graceful shutdown:
- Stops accepting new requests (`server.close()`)
- Waits for in-flight requests to finish
- Forces exit after 10 seconds if they don't

Safety nets:
- `unhandledRejection` (line 78): catches unhandled promise rejections — logs error and exits
- `uncaughtException` (line 89): catches synchronous crashes — exits immediately (unrecoverable)

**Why does `.env` load first?** Because `validateEnv()` reads `process.env`, and every other module might read env vars at import time. Loading `.env` must happen before any `require()`.

---

### `backend/src/app.js` — Express Application

This file creates the Express app, mounts all middleware, and registers all routes.

**Middleware order matters — here's why each position is deliberate:**

```
1. helmet()          — FIRST: sets security headers before any response leaves
2. cors()            — SECOND: rejects cross-origin requests early (before processing)
3. hpp()             — removes duplicate query params (pollution protection)
4. compression()     — gzip all responses (applied before body parsing for efficiency)
5. express.json()    — parses request body (100KB limit — file uploads use multipart)
6. morgan()          — logs every HTTP request after body is parsed (has access to body size)
7. trust proxy       — sets this BEFORE rate limiters so real IP is available
8. rate limiters     — uses real IP from trust proxy setting
9. routes            — actual business logic
10. notFound         — catches requests to unknown routes → 404
11. errorHandler     — LAST: catches ALL errors from above
```

**Rate limiters defined in app.js:**

```javascript
publicReadLimiter:  2000 req / 15 min / IP  → applied to /categories and /products
globalLimiter:       500 req / 15 min / IP  → applied to all /api/* routes
authLimiter:          30 req / 15 min / IP  → applied to /api/v1/auth (skipSuccessfulRequests=true)
```

The `skipSuccessfulRequests: true` on `authLimiter` is important — it means a user who successfully logs in 30 times doesn't get blocked. Only failed attempts count. This protects against brute-force login attacks.

**`trust proxy: 1` (line 94):**
Render.com places the Express server behind an nginx reverse proxy. Without `trust proxy`, the `req.ip` always returns the proxy's IP address (shared by all users) — meaning ALL users share one rate-limit bucket and one user's flood attack burns everyone. Setting `trust proxy: 1` tells Express to read the real client IP from the `X-Forwarded-For` header.

**CORS configuration (lines 27-57):**
- Allowed origins: `process.env.CLIENT_URL` (production Vercel URL) plus localhost URLs in development
- `credentials: true` allows cookies and Authorization headers
- Requests with no origin (Postman, mobile apps) are allowed — `if (!origin) return callback(null, true)`

---

### `backend/src/config/env.js` — Environment Validation

**Two exports:**
1. `validateEnv()` — called once at startup, exits the process if anything is wrong
2. `getConfig()` — returns a typed config object (use this instead of `process.env` in services)

**Required variables (will crash server if missing):**
- `PORT`, `NODE_ENV`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CLIENT_URL`, `JWT_SECRET`

**Validation rules:**
- `PORT`: must be a pure numeric string between 1 and 65535 (rejects "4000abc")
- `SUPABASE_URL`: must be a valid HTTPS URL with a hostname containing a dot
- `CLIENT_URL`: must be HTTPS or `http://localhost:PORT`
- `JWT_SECRET`: must be at least 32 characters
- If `AUTH_OTP_ENABLED=true`, then `SMTP_USER` and `SMTP_PASS` must be set

**Optional variables (warned but not fatal):** `GEMINI_API_KEY`, `CHARGILY_SECRET_KEY`, `SMTP_*`

---

### `backend/src/config/supabase.js` — Two Supabase Clients

This is one of the most important architecture decisions in the project.

**Why two clients?**

```javascript
// CLIENT 1: supabasePublic (ANON key)
// Used ONLY in auth.middleware.js to verify JWT tokens
// The Supabase Auth service validates JWTs using the anon key
// This client CANNOT bypass Row Level Security policies

// CLIENT 2: supabaseAdmin (SERVICE ROLE key)  
// Used in ALL service files for database queries
// The service role key bypasses ALL RLS policies
// ⚠️ NEVER send this key to the frontend
// ⚠️ NEVER expose this in client-side code
```

**Security implication:** The service role key has full database access — it can read, write, and delete any row in any table, ignoring all RLS policies. This is appropriate for a backend server (where we trust our own code) but would be catastrophic if exposed to browsers.

Both clients are created with `autoRefreshToken: false` and `persistSession: false` because the server doesn't need session management — it handles each request independently.

`testConnection()` (line 68): runs a lightweight count query on the `categories` table to verify the Supabase connection is working before the server starts accepting requests.

---

## PART 3: BACKEND — MIDDLEWARE STACK

### `backend/src/middlewares/auth.middleware.js` — JWT Authentication

This middleware runs on every protected route and answers: **"Who is making this request?"**

**`authenticate(req, res, next)` — line 79:**

Step 1: Read the `Authorization` header. If missing or doesn't start with `Bearer `, return 401.

Step 2: Extract the token string after "Bearer ".

Step 3: Call `verifySupabaseToken(token)` — this calls Supabase Auth's `getUser()` API to validate the JWT. Includes:
  - A 6-second timeout (`createAuthTimeout()`) — if Supabase doesn't respond in 6 seconds, we return 503 instead of hanging
  - One automatic retry for transient network errors (ECONNRESET, ETIMEDOUT)

Step 4: If Supabase returns an error or no user, return 401.

Step 5: Call `loadDatabaseUser(supabaseUser.id)` — this queries the `public.users` table (not `auth.users`) to get the user's profile including their `role` and `seller_id`. This is critical because the JWT payload only contains the Supabase Auth user ID, not the application-level role.

Step 6: Attach `req.user = dbUser` so downstream middleware and controllers can access it.

**`optionalAuthenticate(req, res, next)` — line 128:**
Same as `authenticate` but doesn't fail if there's no token — sets `req.user = null` and calls `next()`. Used on public endpoints that have enhanced behavior when logged in (e.g. product browsing tracks views for logged-in users).

**Why does `loadDatabaseUser` also fetch the `sellers` table?**
It attaches `seller_id` to the user object. This is needed in order controllers where we need the seller's UUID to check ownership — "does this order belong to the seller making this request?"

---

### `backend/src/middlewares/role.middleware.js` — Role-Based Access Control

```javascript
// Usage in routes:
router.patch('/:id/status', authenticate, requireRole('seller'), updateOrderStatus);
```

`requireRole(role)` returns a middleware function that checks `req.user.role`. If the role doesn't match, returns 403 Forbidden. This middleware always runs AFTER `authenticate` because it depends on `req.user` being set.

---

### `backend/src/middlewares/validate.middleware.js` — Zod Validation

```javascript
// Usage in routes:
router.post('/', authenticate, validate({ body: createOrderSchema }), createOrder);
```

`validate({ body, params, query })` accepts a Zod schema for each part of the request. It runs `schema.parse()` on the data and:
- On success: attaches the parsed (and coerced) data to `req.validated = { body, params, query }`
- On failure: throws a ZodError, which the global error handler formats into a 400 response

**Why `req.validated` instead of `req.body` directly?**
Controllers must NEVER use `req.body` directly — `req.validated.body` contains type-coerced, sanitized data. For example, a price field declared as `z.number()` in the schema will be a proper JavaScript number in `req.validated.body`, not a string.

---

### `backend/src/middlewares/error.middleware.js` — Global Error Handler

**`AppError` class (line 11):**
A custom Error subclass with a `statusCode` property. Used throughout services to throw predictable errors: `throw new AppError('Order not found', 404)`. This is how services communicate failure without needing to know about HTTP — the error handler converts it.

**`errorHandler(err, req, res, next)` (line 41):**
Must be the LAST middleware registered. Express identifies it as an error handler because it has 4 parameters (`err, req, res, next`).

Error type dispatch:
1. `SyntaxError` → 400 "Invalid JSON in request body" (malformed request body)
2. `ZodError` → 400 with field-level validation errors
3. `AppError` → uses `err.statusCode` (our own intentional errors)
4. PostgreSQL error codes → mapped to appropriate HTTP status (23505=409 conflict, 23503=404 not found, etc.)
5. `MulterError` → 400 for file upload errors (too large, too many files)
6. JWT errors → 401 (invalid/expired token)
7. Everything else → 500 in production (hides stack traces), full message in development

**`asyncHandler(fn)` (line 7):**
A wrapper that catches async errors and passes them to `next()`. In Express 5, this is handled automatically, but it's included for backwards compatibility.

---

### `backend/src/utils/response.js` — Standard Response Format

Every API response from this project follows the same structure:

```javascript
// Success:
{ "success": true, "message": "Order created", "data": { ... } }

// Error:
{ "success": false, "message": "Order not found", "errors": null }
```

`sendSuccess(res, data, message, statusCode = 200)` — sends a success response
`sendError(res, message, statusCode = 400, errors = null)` — sends an error response

**Why a consistent format?** The frontend's `api.js` always knows where to find the data (`response.data.data`), the message (`response.data.message`), and whether it succeeded (`response.data.success`). No parsing ambiguity.

---

### `backend/src/utils/logger.js` — Winston Logger

Winston is configured with:
- Console transport: colorized output in development, structured JSON in production
- File transport: `logs/combined.log` (all levels) and `logs/error.log` (errors only)
- Timestamps on every log entry

Used throughout services: `logger.info()`, `logger.warn()`, `logger.error()`. Never `console.log()` in production code.

---

## PART 4: BACKEND — DATABASE SCHEMA

All 16 tables are hosted in Supabase PostgreSQL 15 (EU West region).

### Table 1: `users`
The central identity table. Mirrors `auth.users` (Supabase's internal auth table).

```
id          UUID  PK   — same as auth.users.id (FK relationship)
email       TEXT  NOT NULL UNIQUE
full_name   TEXT
phone       TEXT
avatar_url  TEXT         — URL in Supabase Storage (avatars bucket)
role        TEXT  CHECK ('client','seller','admin')  DEFAULT 'client'
created_at  TIMESTAMPTZ  DEFAULT now()
updated_at  TIMESTAMPTZ  DEFAULT now()
```

**Created by trigger:** When a user registers via Supabase Auth, the `on_auth_user_created` trigger automatically inserts a row here. The `register()` service then updates it with `full_name`, `phone`, and `role`.

---

### Table 2: `sellers`
Extended profile for users with `role = 'seller'`. One seller per user (UNIQUE on `user_id`).

```
id             UUID  PK
user_id        UUID  FK → users.id  UNIQUE
shop_name      TEXT  NOT NULL
description    TEXT  — short shop tagline
bio            TEXT  — longer personal bio
story          TEXT  — Markdown artisan backstory
location       TEXT  — wilaya name
city           TEXT  — city within wilaya
category_id    UUID  FK → categories.id  — primary craft category
avatar_url     TEXT  — shop logo/photo
is_verified    BOOL  DEFAULT false  — trust badge (admin-granted)
admin_override BOOL  DEFAULT NULL   — NULL=auto, TRUE/FALSE=admin-locked
avg_rating     NUMERIC(3,2) DEFAULT 0
total_sales    NUMERIC(12,2) DEFAULT 0
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
```

**`admin_override` explained:** If an admin manually sets `is_verified = true`, `admin_override` is also set to `true`. This prevents any auto-verification logic from accidentally reverting the admin's decision. If `admin_override = null`, the system can auto-manage `is_verified`.

---

### Table 3: `categories`
Pre-filled craft categories. Only admins can add/edit/delete.

```
id          UUID  PK
name        TEXT  NOT NULL UNIQUE  — e.g. "Jewelry"
slug        TEXT  NOT NULL UNIQUE  — e.g. "jewelry" (URL-safe)
icon_url    TEXT
created_at  TIMESTAMPTZ
```

**Pre-filled values:** Jewelry, Pottery, Textiles, Paintings, Leather Goods, Candles & Soap, Food & Honey, Home Decor, Other

---

### Table 4: `products`
The craftable products listed by sellers. No stock field — everything is made-to-order.

```
id              UUID  PK
seller_id       UUID  FK → sellers.id
category_id     UUID  FK → categories.id
name            TEXT  NOT NULL
description     TEXT
price           NUMERIC(10,2)  — legacy fallback reference price
price_min       NUMERIC(10,2)  — lower bound of price range (shown as "From X DA")
price_max       NUMERIC(10,2)  — upper bound (shown as "X – Y DA")
completion_days INTEGER         — estimated days to complete
avg_rating      NUMERIC(3,2) DEFAULT 0  — auto-updated by trigger
view_count      INTEGER DEFAULT 0
is_active       BOOL DEFAULT true
is_featured     BOOL DEFAULT false
is_new          BOOL DEFAULT false
fts             TSVECTOR  — full-text search vector (auto-updated)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**Price display logic (frontend):**
- `price_min` AND `price_max` → "500 – 2000 DA"
- `price_min` only → "From 500 DA"
- `price` only → "From 500 DA"

**Why no `stock` field?** This is a custom-order platform. Every order is made from scratch. A seller with "Handmade Pottery Bowl" listed can fulfill any number of orders — there's no inventory to deplete.

---

### Table 5: `product_images`
Up to multiple images per product. Position 0 = cover image shown in grids.

```
id          UUID  PK
product_id  UUID  FK → products.id
image_url   TEXT  NOT NULL  — Supabase Storage public URL
position    INTEGER DEFAULT 0
created_at  TIMESTAMPTZ
```

---

### Table 6: `orders`
The central table for the custom order flow. Rich with custom-order specific fields.

```
id               UUID  PK
client_id        UUID  FK → users.id       — who placed the order
seller_id        UUID  FK → sellers.id     — which shop received the order
status           TEXT  CHECK ('pending','accepted','rejected','ready','completed')
total_amount     NUMERIC(10,2)  — reference total at order time (not the final price)
final_price      NUMERIC(10,2)  — SET BY SELLER when marking READY
delivery_type    TEXT  CHECK ('fast','office_pickup','hand_to_hand')
payment_method   TEXT  CHECK ('card','cash_on_delivery')
client_name      TEXT  — denormalized for display without JOIN
client_phone     TEXT
client_address   TEXT
notes            TEXT  — client's requirements/description
budget_min       NUMERIC(10,2)  — client's stated minimum budget
budget_max       NUMERIC(10,2)  — client's stated maximum budget
deadline         DATE            — client's requested completion deadline
reference_images TEXT[]          — array of Supabase Storage URLs for reference
rejection_reason TEXT            — required when status = 'rejected'
is_custom        BOOL DEFAULT true
ready_at         TIMESTAMPTZ     — when seller marked READY
completed_at     TIMESTAMPTZ     — when client confirmed COMPLETED
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

**Status State Machine:**
```
pending → accepted  (seller accepts)
pending → rejected  (seller rejects, must provide rejection_reason)
accepted → ready    (seller marks done, sets final_price)
ready → completed   (CLIENT confirms — sellers CANNOT call /complete)
rejected → (terminal — no further transitions)
completed → (terminal — no further transitions)
```

---

### Table 7: `order_items`
Links orders to specific products. Stores a price snapshot at order time.

```
id          UUID  PK
order_id    UUID  FK → orders.id
product_id  UUID  FK → products.id
quantity    INTEGER NOT NULL  — always 1 for custom orders
unit_price  NUMERIC(10,2)    — reference price SNAPSHOT at order time
created_at  TIMESTAMPTZ
```

---

### Table 8: `reviews`
Product reviews written by clients after completing an order.

```
id          UUID  PK
product_id  UUID  FK → products.id
client_id   UUID  FK → users.id
rating      INTEGER CHECK (1-5)
comment     TEXT
created_at  TIMESTAMPTZ
UNIQUE (product_id, client_id)  — one review per client per product
```

The `trg_product_avg_rating` trigger recalculates `products.avg_rating` after INSERT/UPDATE/DELETE.

---

### Table 9: `ratings`
Seller ratings given by clients (separate from product reviews).

```
id          UUID  PK
seller_id   UUID  FK → sellers.id
client_id   UUID  FK → users.id
rating      INTEGER CHECK (1-5)
created_at  TIMESTAMPTZ
UNIQUE (seller_id, client_id)  — one rating per client per seller
```

The `trg_seller_avg_rating` trigger recalculates `sellers.avg_rating`.

---

### Table 10: `client_ratings`
Sellers rating clients — the reverse direction. Only allowed after order is COMPLETED.

```
id          UUID  PK
order_id    UUID  FK → orders.id  UNIQUE
seller_id   UUID  FK → sellers.id   (who gave the rating)
client_id   UUID  FK → users.id     (who received the rating)
rating      INTEGER CHECK (1-5)
comment     TEXT
created_at  TIMESTAMPTZ
UNIQUE (order_id, seller_id)  — one rating per seller per order
```

---

### Table 11: `wishlist`
Products saved by users (both clients and sellers can use wishlist).

```
id          UUID  PK
user_id     UUID  FK → users.id
product_id  UUID  FK → products.id
created_at  TIMESTAMPTZ
UNIQUE (user_id, product_id)  — can't save same product twice
```

---

### Table 12: `notifications`
System notifications sent to users at key moments in the order flow.

```
id          UUID  PK
user_id     UUID  FK → users.id
type        TEXT  CHECK ('new_order','order_accepted','order_rejected','order_ready','order_completed','system')
title       TEXT  NOT NULL  — also used as i18n key in the frontend
body        TEXT
is_read     BOOL DEFAULT false
meta        JSONB DEFAULT '{}'  — dynamic data for i18n interpolation
created_at  TIMESTAMPTZ
```

**The `meta` field** stores dynamic values used for translation interpolation. For example, an `order_accepted` notification has `meta: { orderId, shopName }`. The frontend uses `shopName` to fill in the translated string: `"Your order was accepted by {{shopName}}"`.

---

### Table 13: `otp_sessions`
Temporary storage for OTP verification sessions during registration.

```
token         UUID  PK  — returned to client as otp_token
user_data     JSONB     — full user profile snapshot
auth_token    TEXT      — Supabase access token (stored pending OTP confirmation)
refresh_token TEXT      — Supabase refresh token
otp_hash      TEXT      — SHA256 hash of the 6-digit code (NEVER store plaintext OTP)
attempts      INTEGER DEFAULT 0  — max 5 before session locked
expires_at    TIMESTAMPTZ  — 10-minute TTL from creation
```

**Security:** The OTP code itself is never stored. Only its SHA256 hash is persisted. On verification, the submitted code is hashed and compared using `crypto.timingSafeEqual()` — this prevents timing oracle attacks.

---

### Table 14: `password_reset_tokens`
One-time tokens for password reset via email link.

```
token       TEXT  PK  — 32-byte cryptographically random hex string
user_id     UUID  FK → auth.users(id)
expires_at  TIMESTAMPTZ  — 15-minute TTL
```

Token is deleted immediately upon successful use (single-use only).

---

### Table 15: `promotions`
Seller promotion requests managed by admin.

```
id               UUID  PK
seller_id        UUID  FK → sellers.id
product_id       UUID  FK → products.id  (null = seller-level, not null = product-level)
placement        TEXT  CHECK ('hero','browse','featured','category_top')
status           TEXT  CHECK ('pending','active','expired','rejected')  DEFAULT 'pending'
requested_days   INTEGER DEFAULT 7  — duration requested (7, 14, or 30 days)
rejection_reason TEXT
starts_at        TIMESTAMPTZ  — set when admin activates
ends_at          TIMESTAMPTZ  — starts_at + requested_days
is_active        BOOL DEFAULT false
created_at       TIMESTAMPTZ
```

**Placement types:**
- `hero` — appears in homepage hero carousel (seller-level)
- `browse` — appears as sponsored strip above product grid (seller-level)
- `featured` — product highlighted in browse page
- `category_top` — product pinned at top of a category

---

### Table 16: `subscriptions`
Seller subscription plans (currently infrastructure for future Chargily integration).

```
id             UUID  PK
seller_id      UUID  FK → sellers.id  UNIQUE
plan           TEXT  CHECK ('free','chatbot')
is_active      BOOL DEFAULT false
started_at     TIMESTAMPTZ
expires_at     TIMESTAMPTZ
created_at     TIMESTAMPTZ
updated_at     TIMESTAMPTZ
```

**Created by trigger:** The `trg_seller_subscription` trigger fires when a new seller profile is inserted — it automatically creates a free subscription row.

---

### The 4 Database Triggers

**1. `on_auth_user_created`**
Fires: after `INSERT` on `auth.users` (Supabase's internal auth table)
Does: inserts a matching row in `public.users` with just `id` and `email`
Why: keeps our application users table synchronized with the auth system

**2. `trg_product_avg_rating`**
Fires: after `INSERT/UPDATE/DELETE` on `reviews`
Does: recalculates the average rating for the affected product using `AVG(rating)`
Why: keeps `products.avg_rating` always in sync without manual calculation

**3. `trg_seller_avg_rating`**
Fires: after `INSERT/UPDATE/DELETE` on `ratings`
Does: recalculates `sellers.avg_rating`
Why: automatically updates seller reputation as new ratings come in

**4. `trg_seller_subscription`**
Fires: after `INSERT` on `sellers`
Does: creates a free subscription row for the new seller
Why: every seller gets a free tier automatically; no extra code in the service

---

## PART 5: BACKEND — SERVICES (Business Logic)

Services contain all business logic. Controllers are thin wrappers. This separation means the business logic could be tested independently of HTTP.

### `backend/src/services/auth.service.js`

**`register({ email, password, full_name, role, phone })`** — lines 134–291

Step 1: Call `supabasePublic.auth.signUp()` — creates the user in Supabase Auth
Step 2: Wait up to 3 times (with 500ms delays) for the `on_auth_user_created` trigger to fire
Step 3: Update the `public.users` row with `full_name`, `phone`, `role`
Step 4: If `AUTH_OTP_ENABLED=true`, call `createOtpSession()` and return `{ requires_otp: true, otp_token }`
Step 5: Otherwise, return `{ user, token, refresh_token }`

**Duplicate email handling:** If Supabase returns "already registered" and OTP is enabled, the service attempts to re-sign in with the same credentials and re-sends an OTP. This handles the case where a user registered but never completed OTP verification.

**`createOtpSession({ user, token, refresh_token })`** — lines 93–132

1. Generate a 6-digit code using `crypto.randomInt(100000, 1000000)` — cryptographically secure
2. Send the code via email with `nodemailer` (SMTP)
3. Delete expired OTP sessions
4. Insert new OTP session row with: UUID `otp_token`, SHA256 hash of code, 10-minute expiry
5. Return `{ requires_otp: true, otp_token }` to the client

**`verifyOtp({ otp_token, otp })`** — lines 388–447

1. Delete expired sessions first
2. Look up the session by `otp_token` UUID
3. Check attempts < 5 (rate limit on OTP guessing)
4. Hash the submitted OTP and compare with stored hash using `crypto.timingSafeEqual()` — **timing-safe comparison prevents timing oracle attacks**
5. If match: delete the session, confirm the email in Supabase Auth (`email_confirm: true`), return the stored tokens
6. If no match: increment `attempts`, throw 401

**`login({ email, password })`** — lines 293–348

1. Call `supabasePublic.auth.signInWithPassword()`
2. If `email_not_confirmed` error: throw 403 (user needs to complete OTP)
3. Check `authData.user.email_confirmed_at` — if null, throw 403
4. Load user profile from `public.users` + `sellers`
5. Return `{ user, token, refresh_token }`

Note: Login does NOT trigger OTP. OTP is registration-only.

**`refreshToken(refresh_token)`** — lines 350–386
Calls `supabasePublic.auth.refreshSession()` with the stored refresh token. Returns new access token + refresh token pair.

**`forgotPassword({ email })`** — lines 570–614
1. Deletes expired tokens for cleanup
2. Looks up user by email (silently returns if not found — security: don't reveal if email exists)
3. Generates 32-byte hex token using `crypto.randomBytes(32).toString('hex')`
4. Stores token + user_id + 15-minute expiry in `password_reset_tokens`
5. Sends email with link: `${CLIENT_URL}/reset-password?token=${token}`

**`resetPassword({ token, new_password })`** — lines 616–651
1. Looks up the token in `password_reset_tokens`
2. Deletes the token immediately (one-time use)
3. Updates the password via Supabase Admin API: `supabaseAdmin.auth.admin.updateUserById()`

---

### `backend/src/services/order.service.js`

**`createOrder(clientUser, orderData)`** — lines 148–269

Step 1: `validateOrderItems(items)` — verifies all products exist, are active, belong to same seller
Step 2: Insert order row with all custom fields (budget, deadline, reference_images, is_custom=true)
Step 3: Insert order_items rows (one per product)
Step 4: Rollback (delete order) if order_items insert fails
Step 5: Fire-and-forget notification to seller: `type: 'new_order'`, `meta: { orderId, clientName }`
Step 6: Return full order via `getOrderById()`

**No stock check:** Custom orders are made to order. The comment `// NOTE: FIX M10 — NO stock decrement step` is intentional and explains the missing stock logic seen in traditional e-commerce.

**`updateOrderStatus(userId, orderId, { status, rejection_reason })`** — lines 371–456

1. Load seller profile for the requesting user
2. Load the order
3. Verify the order belongs to this seller (`order.seller_id !== seller.id` → 403)
4. Validate the transition using `VALID_TRANSITIONS` map: `pending → ['accepted','rejected']`, etc.
5. Update the order row
6. Send notification to client: `order_accepted` or `order_rejected` with rejection reason in `meta`

**`markReady(userId, orderId, { final_price, delivery_type })`** — lines 464–530

- Only callable when `order.status === 'accepted'`
- Sets `status='ready'`, `final_price`, `ready_at=now()`
- Sends `order_ready` notification to client with `meta: { finalPrice, shopName }`

**`confirmComplete(userId, orderId)`** — lines 537–600

- Only callable by the client who placed the order (`order.client_id !== userId` → 403)
- Only when `order.status === 'ready'`
- Sets `status='completed'`, `completed_at=now()`
- Sends `order_completed` notification to seller
- Calls `updateVerificationStatus(order.seller_id)` fire-and-forget — may auto-grant verified badge based on completed order count

---

### `backend/src/services/notification.service.js`

**`getNotifications(userId, { page, limit })`** — paginated list, ordered by `created_at DESC`

**`getUnreadCount(userId)`** — uses `{ count: 'exact', head: true }` for a lightweight count-only query (no rows returned, very fast)

**`markAsRead(userId, notificationId)`** — verifies ownership first (`notif.user_id !== userId` → 403), then updates `is_read = true`. Skips the update if already read.

**`markAllAsRead(userId)`** — single UPDATE targeting all unread notifications for the user: `.eq('is_read', false)`

**`deleteNotification(userId, notificationId)`** — ownership check before delete

---

### `backend/src/services/promotion.service.js`

**`requestPromotion(sellerId, { placement, requested_days, product_id })`** — lines 13–96

1. If `product_id` provided: verify the product belongs to this seller
2. Check for existing active/pending promotions (prevent duplicates)
3. Insert new promotion with `status: 'pending'`, `is_active: false`

**Conflict check logic:**
- Product-level promotions: one pending/active per `(seller_id, product_id)` combination
- Seller-level promotions: one pending/active per seller for `hero`/`browse` placements

**`getHeroAds()`** — lines 123–153
Queries promotions where `placement='hero'`, `status='active'`, `is_active=true`, `ends_at > NOW()`. Joins seller + category data. Returns up to 6 results for the homepage carousel.

**`getBrowseAds()`** — similar but for `placement='browse'`, returns up to 4 results for the browse page strip.

---

### `backend/src/services/admin.service.js`

**`getStats()`** — lines 143–294
Runs 16 parallel database queries using `Promise.all()` to collect platform metrics:
- User counts by role
- Product counts (total/active/inactive)
- Order counts by each status
- Revenue (sum of `final_price` on completed orders)
- New users and orders this month
- Top 5 sellers by completed order count
- Top 5 products by average rating

**`verifySeller(sellerId, isVerified)`** — lines 302–341
Updates both `is_verified` and `admin_override` to the same value. Setting `admin_override = true` locks the verified status so auto-verification can't revert it. Sends a notification to the seller.

**`deleteProduct(productId)`** — lines 348–386
Must delete child records first (to avoid FK constraint violations):
```
browsing_events → reviews → wishlist → product_images → promotions → order_items → products
```
All cleanup queries run in parallel with `Promise.all()`.

**`getUsers(params)`** — lines 14–137
Paginated user list with enrichment: batch-fetches product counts, order counts, and client ratings for all returned users in parallel (avoids N+1 queries).

---

### `backend/src/services/chatbot.service.js`

**`sendMessage({ message, conversation_history })`** — lines 61–97

1. Initialize `GoogleGenerativeAI` with `GEMINI_API_KEY` (lazy singleton)
2. Load `gemini-2.5-flash` model
3. Build `contents` array from conversation history + current message
   - Note: Gemini uses `'model'` for assistant turns (not `'assistant'`) — conversion happens in `buildCombinedContents()`
4. Call `model.generateContent({ contents, systemInstruction: SYSTEM_INSTRUCTION })`
5. Return the text response

**`SYSTEM_INSTRUCTION`** defines the chatbot's persona: Hirftna assistant, explains platform features, responds in user's language (Arabic/French/English), cannot negotiate prices or share personal info.

---

### Other Services (Summary)

**`product.service.js`:**
- `getAllProducts()`: multi-filter query (search via `fts`, category, price range, sort by newest/rating/price), joins seller + images + category, applies pagination
- `createProduct()`: inserts product row + product_images rows (in transaction-like sequence)
- `deleteProduct()`: deletes product_images, wishlist entries, reviews, order_items, then the product
- Products are visible regardless of seller verification status (`is_verified` is NOT filtered)

**`seller.service.js`:**
- `createSeller()`: creates seller profile, validates shop_name uniqueness
- `getSellerById()`: returns public profile with products and ratings
- `getAnalytics()`: counts orders by status for the seller's shop

**`review.service.js`:**
- `createReview()`: creates product review (checks client hasn't already reviewed this product)
- `createRating()`: creates seller rating (requires at least one completed order between client and seller)

**`clientRating.service.js`:**
- `rateClient()`: seller rates a client — requires `order.status === 'completed'` and `order.seller_id === seller.id`

**`upload.service.js`:**
- Uses `multer` for file parsing, `sharp` for image processing, `file-type` for magic byte validation
- Validates: MIME type must be image/jpeg, image/png, or image/webp; max 5MB; max 5 files at once
- Uploads to Supabase Storage (`product-images` or `avatars` bucket)
- Returns public URL

**`category.service.js`:** CRUD operations on categories. Uses `slugify` to generate URL-safe slugs from category names.

**`wishlist.service.js`:** Add/remove/check items. Returns 409 if item already in wishlist. Uses UNIQUE constraint.

**`verification.service.js`:** Auto-verifies sellers who meet criteria (called after order completion). Respects `admin_override` — won't change status if admin has manually set it.

---

## PART 6: BACKEND — CONTROLLERS & ROUTES

Controllers are thin: extract data from `req.validated`, call service, send response.

### Auth Routes — `/api/v1/auth`

| Method | Path | Auth | Role | What it does |
|--------|------|------|------|--------------|
| POST | `/register` | None | Any | Register new account; returns OTP session if 2FA enabled |
| POST | `/login` | None | Any | Login with email/password; returns JWT tokens |
| POST | `/verify-otp` | None | Any | Verify 6-digit OTP code; completes registration |
| POST | `/refresh` | None | Any | Refresh access token using refresh_token |
| GET | `/me` | Required | Any | Get current user profile |
| PUT | `/me` | Required | Any | Update profile (name, phone, avatar) |
| POST | `/logout` | Required | Any | Invalidate session |
| POST | `/change-password` | Required | Any | Change password (requires old_password) |
| POST | `/forgot-password` | None | Any | Send password reset email (rate-limited: 5/15min) |
| POST | `/reset-password` | None | Any | Reset password with token from email |

---

### Product Routes — `/api/v1/products`

| Method | Path | Auth | Role | What it does |
|--------|------|------|------|--------------|
| GET | `/` | Optional | Any | Browse products (filters: search, category, price, sort; pagination) |
| GET | `/my-products` | Required | Seller | Get seller's own products |
| POST | `/` | Required | Seller | Create a product |
| PUT | `/:id` | Required | Seller | Update own product |
| DELETE | `/:id` | Required | Seller | Delete own product |
| GET | `/:id` | Optional | Any | Get product detail (increments view_count) |

Note: `/my-products` route is registered BEFORE `/:id` in the router to prevent "my-products" from being treated as a product ID.

---

### Order Routes — `/api/v1/orders`

| Method | Path | Auth | Role | What it does |
|--------|------|------|------|--------------|
| POST | `/` | Required | Any | Create custom order |
| GET | `/` | Required | Any | List orders (role-scoped; `?as=client` for sellers as buyers) |
| GET | `/:id` | Required | Any | Get order detail (ownership verified) |
| PATCH | `/:id/status` | Required | Seller | Accept or reject an order |
| PATCH | `/:id/ready` | Required | Seller | Mark order ready + set final_price |
| PATCH | `/:id/complete` | Required | Client | Confirm order completion |

---

### Seller Routes — `/api/v1/sellers`

| Method | Path | Auth | Role | What it does |
|--------|------|------|------|--------------|
| GET | `/` | Optional | Any | Browse all sellers (paginated) |
| GET | `/me` | Required | Seller | Get own full profile |
| GET | `/me/verification-status` | Required | Seller | Check own verification status |
| GET | `/analytics` | Required | Seller | Shop analytics (order counts by status) |
| POST | `/` | Required | Seller | Create seller profile |
| PUT | `/:id` | Required | Seller | Update seller profile |
| GET | `/:id` | Optional | Any | Get public seller profile |

---

### Admin Routes — `/api/v1/admin`

| Method | Path | Auth | Role | What it does |
|--------|------|------|------|--------------|
| GET | `/users` | Required | Admin | List users (paginated, filter by role/search/verified) |
| GET | `/products` | Required | Admin | List ALL products including inactive |
| GET | `/stats` | Required | Admin | Platform statistics dashboard |
| PATCH | `/sellers/:id/verify` | Required | Admin | Grant/revoke verified badge |
| DELETE | `/products/:id` | Required | Admin | Force-delete any product |
| PATCH | `/users/:id/role` | Required | Admin | Change user role (not to admin) |
| GET | `/promotions` | Required | Admin | List promotion requests |
| PATCH | `/promotions/:id/activate` | Required | Admin | Activate a promotion |
| PATCH | `/promotions/:id/reject` | Required | Admin | Reject a promotion with reason |

---

### Other Routes Summary

**`/api/v1/reviews`:** GET product reviews (public), POST product review (client), GET seller ratings (public), POST seller rating (client), DELETE review (client)

**`/api/v1/client-ratings`:** POST rate client (seller, after completed order), GET client ratings (public)

**`/api/v1/wishlist`:** GET list (auth), POST add (auth), GET `:product_id/check` (auth), DELETE `:product_id` (auth)

**`/api/v1/notifications`:** GET list (auth), GET unread-count (auth), PATCH `:id/read` (auth), PATCH `mark-all-read` (auth), DELETE `:id` (auth)

**`/api/v1/uploads`:** POST `/image` (single, auth), POST `/images` (up to 5, auth, per-user rate limit: 20/15min)

**`/api/v1/chatbot`:** POST `/` (auth, 20 req/hour per user)

**`/api/v1/promotions`:** GET `/hero` (public), GET `/browse` (public), GET `/featured-products` (public), POST `/request` (seller), GET `/me` (seller)

**`/api/v1/categories`:** GET all (public), GET by slug (public), POST/PUT/DELETE (admin only)

---

## PART 7: BACKEND — VALIDATORS

All validators use **Zod v4** and are applied via the `validate()` middleware.

### `auth.validator.js`
- `registerSchema`: email (email format), password (min 8 chars), full_name (min 2 chars), role (enum: 'client'/'seller'), phone (optional)
- `loginSchema`: email, password
- `verifyOtpSchema`: otp_token (UUID), otp (6-char string)
- `changePasswordSchema`: old_password, new_password (min 8 chars)
- `forgotPasswordSchema`: email
- `resetPasswordSchema`: token (64 hex chars), new_password (min 8 chars)

### `order.validator.js`
- `createOrderSchema`: items (array of `{ product_id: UUID, quantity: positive integer }`), notes (optional), budget_min/max (positive numbers), deadline (ISO date), reference_images (optional array of URLs), delivery_type (enum), payment_method (enum), client_name, client_phone, client_address
- `updateStatusSchema`: status (enum: 'accepted'/'rejected'), rejection_reason (required when rejecting)
- `markReadySchema`: final_price (positive number), delivery_type (optional enum)

### `product.validator.js`
- `createProductSchema`: name (min 3 chars), description (optional), price/price_min/price_max (optional numbers), category_id (UUID), completion_days (optional positive integer), is_active (optional boolean)
- `updateProductSchema`: same fields as create, all optional (partial update)

### `promotion.validator.js`
- `requestPromotionSchema`: placement (enum: 'hero'/'browse'/'featured'/'category_top'), requested_days (enum: 7/14/30), product_id (optional UUID)

### Other Validators
- `seller.validator.js`: shop_name (min 3 chars), description/bio/story (optional text), city/location (optional), category_id (optional UUID)
- `review.validator.js`: rating (1–5 integer), comment (optional), product_id/seller_id (UUID)
- `chatbot.validator.js`: message (max 1000 chars), conversation_history (max 20 turns, each with role: 'user'/'assistant' and content string)

---

## PART 8: FRONTEND — APP SETUP & ROUTING

### `frontend/src/main.jsx` — Entry Point

```jsx
// Mounts React app into #root div in index.html
// Wraps everything in LanguageProvider (i18n)
createRoot(document.getElementById('root')).render(
  <LanguageProvider>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </LanguageProvider>
)
```

React StrictMode is intentionally removed (noted in FRONTEND_CONTEXT.md) — it caused double API calls in development which confused debugging.

`LanguageProvider` sets up i18next and attaches the language to the document. `AuthProvider` provides authentication state. `AppRouter` renders the routing tree.

---

### `frontend/src/App.jsx` — Root Component

Wraps the entire app in `ErrorBoundary`. The `ErrorBoundary` (class component) catches any unhandled render errors across the whole component tree and shows a friendly error UI instead of crashing the browser.

---

### `frontend/src/router/index.jsx` — Routing

**`RootLayout` (line 184):**
```jsx
function RootLayout() {
  return (
    <>
      <MainLayout />    {/* renders TopBar + Outlet (current page) + BottomNav */}
      <CustomOrderForm />  {/* global modal, always mounted, listens for events */}
      <ChatbotWidget />    {/* floating chat button, always mounted */}
    </>
  );
}
```

This is the key architectural decision for `CustomOrderForm` — it's mounted at the root level, outside any page. When any `ProductCard` or `ProductPage` fires `window.dispatchEvent(new CustomEvent('open-order-form', { detail: { product } }))`, the `CustomOrderForm` hears it regardless of which page is currently showing.

**Route Guards:**

| Guard | Condition | Behavior when blocked |
|-------|-----------|----------------------|
| `RequireAuth` | Must be logged in | Redirects to `/login` with `state.from` |
| `RequireSeller` | Must be logged in AND role=seller | Clients → `/`; unauthenticated → `/login`; admin → `/admin` |
| `RequireNotAdmin` | Must be logged in AND role≠admin | Admin → `/admin`; unauthenticated → `/login` |
| `GuestOnly` | Must NOT be logged in | Authenticated → `/` |
| `RequireAdmin` | Must be logged in AND role=admin | Non-admin → `/`; unauthenticated → `/login` |

**Loading screen:** All guards show `<div className="min-h-screen bg-cream-100" />` while `AuthContext` is hydrating from `localStorage`. This prevents the jarring flash of a login redirect on page load.

**Complete Route Map:**
```
/                      → HomePage (public)
/browse                → BrowsePage (public)
/products/:id          → ProductPage (public)
/sellers/:id           → SellerPage (public)
/login                 → LoginPage (GuestOnly)
/register              → RegisterPage (GuestOnly)
/forgot-password       → ForgotPasswordPage (GuestOnly)
/reset-password        → ResetPasswordPage (GuestOnly)
/wishlist              → WishlistPage (RequireNotAdmin)
/orders                → OrdersPage (RequireNotAdmin)
/notifications         → NotificationsPage (RequireAuth)
/profile               → ProfilePage (RequireAuth)
/client/:id            → ClientProfilePage (RequireAuth)
/seller/dashboard      → SellerDashboard (RequireSeller)
/seller/products       → SellerProducts (RequireSeller)
/seller/orders         → SellerOrdersPage (RequireSeller)
/seller/profile        → SellerProfileEdit (RequireSeller)
/seller/promotions     → SellerPromotions (RequireSeller)
/admin                 → AdminDashboard (RequireAdmin)
/admin/users           → AdminUsers (RequireAdmin)
/admin/products        → AdminProducts (RequireAdmin)
/admin/promotions      → AdminPromotions (RequireAdmin)
/admin/categories      → AdminCategories (RequireAdmin)
*                      → NotFoundPage
```

---

## PART 9: FRONTEND — STATE MANAGEMENT (AuthContext)

### `frontend/src/context/AuthContext.jsx`

This is the single source of truth for authentication state. Every component that needs to know "who is logged in" uses the `useAuth()` hook.

**State variables:**
- `user` — the full user profile object (or null if not logged in)
- `loading` — true while hydrating from localStorage or during auth operations
- `pendingOtp` — stores the OTP session data during registration (shown to `RegisterPage`)

**Bootstrap effect (lines 49–112):**
When the app loads, if a token is in `localStorage`, it calls `authAPI.getMe()` to verify the session is still valid. This is critical for security — an expired token in `localStorage` should not let the user stay "logged in". The bootstrap uses a shared promise (`bootstrapPromise`) so multiple components mounting simultaneously don't trigger multiple API calls.

**`login(email, password)`** — line 114:
Calls `authAPI.login()`. If the response contains `requires_otp: true`, stores the OTP session in `pendingOtp` state and returns `{ requiresOtp: true }`. The `LoginPage` would then show an OTP input (though in practice, OTP is registration-only — login is direct).

**`register(payload)`** — line 157:
Calls `authAPI.register()`. If OTP required (when `AUTH_OTP_ENABLED=true`), stores the OTP session in `pendingOtp`. The `RegisterPage` switches to OTP input mode.

**`verifyOtp(payload)`** — line 140:
Calls `authAPI.verifyOtp()`. On success, calls `persistSession()` which stores tokens + user in `localStorage` and updates `user` state.

**`logout()`** — line 183:
Calls `authAPI.logout()` (invalidates server session), then clears `localStorage` and sets `user = null`. If the API call fails (e.g. network error), it still clears local state.

**`persistSession(session)`** — line 28:
Called after successful login/register/OTP. Calls `storeSession()` from `api.js` (writes to `localStorage`) and updates `user` state.

**`updateUser(updatedUser)`** — line 198:
Used by profile edit pages. Merges partial updates into the current `user` state and updates `localStorage` — so refreshing the page after editing profile shows the new name immediately.

**Exposed values (the context value object):**
```javascript
{
  user,           // full user object or null
  loading,        // true during hydration/operations
  pendingOtp,     // OTP session data or null
  login,          // (email, password) => Promise
  verifyOtp,      // (payload) => Promise
  register,       // (payload) => Promise
  logout,         // () => Promise
  updateUser,     // (partial) => void (optimistic update)
  changePassword, // (payload) => Promise
  isAuthenticated, // Boolean(user)
  isClient,       // user?.role === 'client'
  isSeller,       // user?.role === 'seller'
  isAdmin,        // user?.role === 'admin'
}
```

**`useAuth()` hook (line 252):**
```javascript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
```
Any component that calls `useAuth()` outside an `<AuthProvider>` gets an immediate clear error instead of a silent null.

---

## PART 10: FRONTEND — API SERVICE LAYER

### `frontend/src/services/api.js`

This file is the entire communication layer between React and the Express backend.

**API_BASE_URL (lines 11–25):**
IIFE (Immediately Invoked Function Expression) that reads `VITE_API_URL`. In production, throws an error if not set — this forces the build to fail fast rather than serving a broken app. Falls back to `http://localhost:4000/api/v1` in development.

**localStorage keys:**
```javascript
hirftna_token         → JWT access token
hirftna_refresh_token → Refresh token for getting new access tokens
hirftna_user          → Serialized user object (JSON)
```

**Axios instance (line 44):**
```javascript
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,   // 15 second timeout on all requests
  headers: { 'Content-Type': 'application/json' },
});
```

**Request interceptor (line 250):**
Reads the token from `localStorage` and attaches `Authorization: Bearer <token>` to every outgoing request automatically. No component needs to manually set this header.

**Response interceptor — Token Refresh Logic (lines 297–338):**
When a response comes back with status 401 (unauthorized):
1. Mark the original request with `_retry = true` (prevents infinite retry loop)
2. Call `refreshAccessToken()` — a singleton promise, so 5 simultaneous requests all wait for one refresh
3. If refresh succeeds: replay the original request with the new token
4. If refresh fails: clear session, redirect to `/login`

`refreshAccessToken()` uses a `failedQueue` array to hold all other requests that arrived while refresh was in progress. Once the new token arrives, all queued requests are replayed.

**`normalizeApiResponse(response)` (line 204):**
The backend returns data in different shapes depending on the endpoint:
- `{ data: { items: [...], pagination: {...} } }` for list endpoints
- `{ data: { order: {...} } }` for single entity endpoints
- `{ data: [...] }` for simple lists

`normalizeApiResponse` handles all these shapes and returns `{ items, entity, pagination }` consistently. Components call `extractApiItems()`, `extractApiEntity()`, or `extractApiPagination()` to access what they need.

**Categories cache (lines 386–407):**
```javascript
let _categoriesCache = null;
let _categoriesCacheTime = 0;
const _CATEGORIES_TTL = 10 * 60 * 1000; // 10 minutes

categoriesAPI.getAll = async () => {
  if (_categoriesCache && (now - _categoriesCacheTime) < _CATEGORIES_TTL) {
    return _categoriesCache;
  }
  const res = await api.get('/categories');
  _categoriesCache = res;
  ...
};
```

Categories are fetched once and cached in memory for 10 minutes. Every component that calls `categoriesAPI.getAll()` shares the same result — only one network request is made per 10-minute window.

**API modules — complete list with what they call:**

| Module | Methods |
|--------|---------|
| `authAPI` | register, login, verifyOtp, logout, getMe, updateMe, changePassword, forgotPassword, resetPassword |
| `productsAPI` | getAll, getById, getMyProducts, create, update, delete |
| `ordersAPI` | create, getAll, getById, updateStatus, markReady, confirmComplete |
| `categoriesAPI` | getAll (cached), getById, getBySlug, create, update, delete |
| `sellersAPI` | getAll, getById, getMe, getAnalytics, getVerificationStatus, create, update |
| `reviewsAPI` | getProductReviews, getSellerRatings, createReview, createRating, deleteReview |
| `wishlistAPI` | getAll, add, remove, check |
| `notificationsAPI` | getAll, getUnreadCount, markRead, markAllRead, delete |
| `uploadsAPI` | uploadImage, uploadImages |
| `chatbotAPI` | sendMessage |
| `promotionsAPI` | getHeroAds, getBrowseAds, getFeaturedProducts, request, getMe, getMyProductPromotions |
| `adminAPI` | getUsers, getProducts, getStats, verifySeller, deleteProduct, updateUserRole, getPromotions, activatePromotion, rejectPromotion |
| `clientRatingsAPI` | create, getByClient |
| `usersAPI` | getPublicProfile |

---

## PART 11: FRONTEND — PAGES

### `HomePage.jsx`

**What the user sees:** Split-screen hero (artisan image + headline + search), How It Works section (4 steps), featured products grid, top sellers strip, footer.

**Data fetched:**
- `promotionsAPI.getHeroAds()` — if active hero ads exist, the hero shows a `HeroCarousel` with sponsored sellers; otherwise a static artisan image
- `productsAPI.getAll({ limit: 8, sort: 'top_rated' })` — featured products section
- `sellersAPI.getAll({ limit: 6 })` — seller cards section

**HowItWorksSection:** 4-step visual guide (Request → Accept → Ready → Complete). Uses `useInView` hook for scroll-triggered animation — each step fades in as it enters the viewport.

**Search bar:** Input that navigates to `/browse?search=<query>` on submit.

---

### `BrowsePage.jsx`

**What the user sees:** Filter sidebar (categories, price range), search bar, sort dropdown, product grid, pagination, promoted sellers strip.

**State managed:**
- `filters` — `{ search, category_id, price_min, price_max, sort, page }`
- `products` / `pagination` — results from API
- `loading` / `fetchError` — loading and error states
- `promotedSellers` — from `promotionsAPI.getBrowseAds()`

**URL sync:** Filters are synced to URL query parameters (`?search=X&category_id=Y`). When the page loads, `useEffect` reads the URL params to restore filter state. When filters change, `useSearchParams` is updated.

**Pagination:** Page buttons at the bottom. Each page change updates the `page` query param and scrolls to top.

---

### `ProductPage.jsx`

**What the user sees:** Image gallery (with thumbnails), product name + price range + completion days, tabs (Details / Reviews / About Seller), "Request Custom Order" button, wishlist heart icon.

**Data fetched:**
- `productsAPI.getById(id)` — full product with seller + images + category
- `reviewsAPI.getProductReviews(id)` — product reviews tab
- `wishlistAPI.check(id)` — whether this product is in user's wishlist

**Key action:** Clicking "Request Custom Order" fires `window.dispatchEvent(new CustomEvent('open-order-form', { detail: { product } }))`. The `CustomOrderForm` component (mounted in `RootLayout`) receives this event and opens the modal.

**Wishlist toggle:** Calls `wishlistAPI.add(id)` or `wishlistAPI.remove(id)`. Uses optimistic update — the heart turns red immediately, then reverts if the API call fails.

---

### `SellerPage.jsx`

**What the user sees:** Seller avatar, shop name, verified badge (if applicable), average rating, tabs (Products / Story / Reviews).

**Data fetched:**
- `sellersAPI.getById(id)` — seller profile
- `productsAPI.getAll({ seller_id: id })` — seller's products
- `reviewsAPI.getSellerRatings(id)` — seller ratings

---

### `LoginPage.jsx`

**State:** `email`, `password`, `loading`, `error`, `verified` (from route state after successful registration)

If `location.state?.verified === true` (redirected from RegisterPage after OTP), shows a green success banner: "Email verified! You can now log in."

If API returns 403 (email not confirmed): shows amber warning linking to registration.

On success: navigates to `location.state?.from` (the page the user was trying to access) or `/`.

---

### `RegisterPage.jsx`

**3-phase state machine:**

**Phase 1 — Registration Form:**
- Full name, email, password (with strength meter), confirm password, role selection (Client / Artisan Seller)
- Submit → POST `/auth/register`

**Phase 2 — OTP Verification (if `requires_otp: true`):**
- Shows 6-digit code input
- Countdown timer from `otp_expires_in`
- Submit → POST `/auth/verify-otp`
- On success: navigate to `/login` with `state: { verified: true }`

**Why navigate to login after OTP instead of auto-login?**
The OTP session may have been created without a valid auth token (e.g. resent OTP flow). Sending the user to `/login` with a verified banner is the safest approach.

---

### `ForgotPasswordPage.jsx` and `ResetPasswordPage.jsx`

`ForgotPasswordPage`: Single email input. Calls `authAPI.forgotPassword(email)`. Always shows "If this email exists, we sent a reset link" — never reveals whether email is registered.

`ResetPasswordPage`: Reads `token` from URL params. Shows new password + confirm fields. Calls `authAPI.resetPassword(token, new_password)`. On success: redirects to `/login`.

---

### `OrdersPage.jsx` (Client)

**What the user sees:** Status filter tabs (All / Pending / Accepted / Ready / Completed / Rejected), list of `OrderCard` components.

**Data fetched:** `ordersAPI.getAll()` — automatically scoped to the client's orders by the backend

**Key actions:**
- Sellers viewing this page with `?as=client` param see their outgoing orders (as buyers)
- "Confirm Complete" on READY orders opens `PaymentStep` component
- After completing, shows review prompts

---

### `WishlistPage.jsx`

Grid of `ProductCard` components loaded from `wishlistAPI.getAll()`. Each card has a remove button. On load failure, shows error via `Toast` component.

---

### `SellerDashboard.jsx`

**What the user sees:** Stats cards (total orders, pending, completed, revenue), recent orders list, quick action buttons, verification badge info card, "Boost Your Shop" link.

**Data fetched:**
- `sellersAPI.getAnalytics()` — order counts by status
- `ordersAPI.getAll({ limit: 5 })` — recent 5 orders

Verification info card explains what the verified badge means and how to earn it — it's informational, NOT a gate. Sellers can sell without being verified.

---

### `SellerProducts.jsx`

**What the user sees:** Product grid with edit/delete buttons, "Add Product" form in a modal.

**Product creation form fields:** Name, description, category, price range (min/max), completion days, multiple image uploads.

**Image upload flow:**
1. User selects images via file input
2. Files are sent to `uploadsAPI.uploadImages(files)` → POST `/uploads/images`
3. Backend validates, processes with `sharp`, uploads to Supabase Storage
4. Returns array of public URLs
5. URLs are included in the product creation payload

---

### `SellerOrdersPage.jsx`

**Two tabs:**
1. **Incoming** — orders placed by clients to this seller's shop
2. **Outgoing (as buyer)** — orders the seller placed at other shops (`GET /orders?as=client`)

Each order card shows status and actions appropriate to the current status.

---

### `SellerProfileEdit.jsx`

**Three tabs:**
1. **Account** — name, phone, email (read-only), avatar upload
2. **Story** — Markdown editor for the artisan backstory
3. **Shop** — shop name, description, bio, city, category selection

Avatar upload uses `uploadsAPI.uploadImage()`. On error, shows toast notification.

---

### `SellerPromotions.jsx`

**What the user sees:**
- Current promotion status (pending/active/rejected/expired/none)
- For active: countdown timer (days remaining) and progress bar
- For rejected: reason shown + option to re-submit
- For none/expired: promotion request form

**Request form:** Placement (Hero / Browse), duration (7 / 14 / 30 days), submit button.

After submitting, if `PaymentModal` logic is needed, it opens the CCP payment instructions. Admin then reviews and activates.

---

### Admin Pages

**`AdminDashboard.jsx`:**
Stats cards (users, products, orders, revenue), order status breakdown bar chart, top 5 sellers table, top 5 products table. Data from `adminAPI.getStats()`.

**`AdminUsers.jsx`:**
Paginated user table with role filter (All / Clients / Sellers) and search. For sellers: shows shop name, verified status, product count. Verify/Revoke button calls `adminAPI.verifySeller(sellerId, true/false)`.

**`AdminProducts.jsx`:**
All products (active + inactive). Delete button opens confirmation modal. Uses `adminAPI.deleteProduct()`.

**`AdminPromotions.jsx`:**
Promotion requests table with status filter. Approve button calls `adminAPI.activatePromotion(id)`. Reject button opens modal for rejection reason, calls `adminAPI.rejectPromotion(id, reason)`.

**`AdminCategories.jsx`:**
CRUD for categories. Create/edit form with name → auto-generates slug. Uses `categoriesAPI.create/update/delete`.

---

## PART 12: FRONTEND — COMPONENTS

### Layout Components

**`MainLayout.jsx`:**
Wrapper component rendered by React Router's `<Outlet>`. Contains `TopBar`, the page content (`<Outlet />`), and `BottomNav`. Also runs a `setInterval` every 120 seconds to call `notificationsAPI.getUnreadCount()` and update the notification badge count. The interval is paused when `document.hidden === true` (tab not visible) to avoid wasted requests.

**`TopBar.jsx`:**
Logo (links to `/`), categories dropdown, search bar, language switcher, and desktop navigation icons. On mobile, shows a hamburger menu that opens a bottom sheet with categories. The search bar triggers navigation to `/browse?search=<query>` on submit.

**`BottomNav.jsx`:**
Mobile floating pill navigation bar. Role-aware — shows different items for visitors/clients/sellers. Uses CSS `.pill-nav` class for the floating pill design with a semi-transparent background.

**`DesktopNav.jsx`:**
Desktop icon bar in the top-right. Shows wishlist icon (with count), orders icon, notifications icon (with unread badge), and profile dropdown. The profile dropdown is role-aware — shows different links for client/seller/admin.

**`DashboardSidebar.jsx`:**
Sidebar navigation for seller dashboard pages. Links to Dashboard, Products, Orders, Profile, Promotions.

---

### Product Components

**`ProductCard.jsx`:**
The card shown in grids throughout the app. Contains:
- Top: category badge
- Image (from `product.images[0]?.image_url` — position 0 = cover)
- `PromotedBadge` if `product._promotion_active`
- Shop name and verified badge
- Price range formatted by `formatProductPrice()`
- Wishlist heart button with `animate-heart-beat` animation on toggle
- `hover-lift` CSS class for the hover elevation effect
- "Request Custom Order" CTA button → fires `open-order-form` custom event

**`ProductCardSkeleton.jsx`:**
Animated placeholder card shown while products load. Same dimensions as `ProductCard`, uses `.skeleton` CSS class for the pulsing animation.

**`PromotedBadge.jsx`:**
Small "Promoted" tag shown on product cards for sponsored products.

---

### Order Components

**`CustomOrderForm.jsx`:**
Global modal mounted in `RootLayout`. Listens for `window.addEventListener('open-order-form', handler)`.

**3 steps:**
1. **Requirements:** notes/description, budget_min, budget_max, deadline (date picker), reference_images (upload up to 3)
2. **Delivery:** delivery_type (Fast / Office Pickup / Hand to Hand), payment_method (Cash / Card)
3. **Contact:** client_name, client_phone, client_address (pre-filled from user profile)

Submits to `ordersAPI.create()`. On success: shows confirmation and resets form.

**`OrderCard.jsx`:**
Displays a single order with all details and context-appropriate action buttons:

| Order Status | Client sees | Seller sees |
|-------------|-------------|-------------|
| pending | View details | Accept / Reject buttons |
| accepted | Waiting... | Mark as Ready button |
| ready | Final price + Confirm Complete | Waiting for client... |
| completed | Rate Seller button (if not yet rated) | Rate Client button |
| rejected | Rejection reason | View only |

"Confirm Complete" opens `PaymentStep` (not calls API directly).

**`OrderStatusBadge.jsx`:**
Colored badge with icon for each order status. Maps status → CSS class and Lucide icon.

**`PaymentStep.jsx`:**
Intercepts the "Confirm Complete" button on READY orders. Shows two tabs:
- **Cash on Delivery:** Checkbox "I confirm I received payment" → calls `ordersAPI.confirmComplete()`
- **Card (Chargily):** Simulated with a 2-second spinner → success → calls `ordersAPI.confirmComplete()`

**`RateClientModal.jsx`:**
Shown to sellers after an order is completed. 1-5 star rating + optional comment. Calls `clientRatingsAPI.create({ order_id, client_id, rating, comment })`.

**`ReviewSellerModal.jsx`:** Shown to clients after completion. Calls `reviewsAPI.createRating()`.

**`ReviewProductModal.jsx`:** Product-level review (separate from seller rating). Calls `reviewsAPI.createReview()`.

---

### Payment Components

**`PaymentModal.jsx`:**
Used for seller-to-platform payments (activation fees, promotion fees). Shows:
- CCP account number for bank transfer
- BaridiMob payment details
- Chargily card payment (disabled, "Coming Soon")

This is NOT the same as `PaymentStep`. `PaymentModal` = seller pays the platform. `PaymentStep` = client pays the seller.

---

### UI Components

**`Modal.jsx`:** Reusable modal with backdrop. Props: `isOpen`, `onClose`, `title`, `children`. Traps focus inside and closes on Escape key.

**`Spinner.jsx`:** Loading spinner in 5 sizes (xs/sm/md/lg/xl). Uses `animate-spin` CSS class.

**`Badge.jsx`:** Colored badge in variants: sage (green), cream, success, warning, danger, info. Used for categories, statuses, etc.

**`StarRating.jsx`:** Two modes — `interactive` (click to rate) and read-only (display rating with filled/empty stars). Interactive mode used in review forms.

**`Toast.jsx`:** Shared toast notification component. Props: `message`, `type` (success/error/info), `onClose`. Appears at top-right, auto-dismisses after 3 seconds.

**`LanguageSwitcher.jsx`:** Toggle between AR and EN. Clicking EN: sets i18n language to 'en', removes `dir="rtl"` from `document.documentElement`. Clicking AR: sets language to 'ar', adds `dir="rtl"`.

**`LogoMark.jsx`:** The brand logo. Uses Amiri font for "حرفتنا" (Arabic) and Inter font for "MARKETPLACE" (Latin). The two font keys `common.appNameArabic` and `common.appNameLatin` come from i18n.

**`VerifiedBadge.jsx`:** Small checkmark badge shown next to verified sellers. Uses the sage green color.

**`ErrorBoundary.jsx`:** React class component (class components are required for `componentDidCatch`). Wraps the entire app. On render error: shows a full-screen error UI with a "Refresh Page" button that calls `window.location.reload()`.

---

### Chatbot Components

**`ChatbotWidget.jsx`:**
Floating button (bottom-right, sage green, only for authenticated users). Click opens a chat panel (380px desktop, full-width mobile, 500px height).

Features:
- Typing indicator (animated dots)
- Suggestion chips on first open ("How do I place an order?", etc.)
- Conversation history sent with each message
- Enter key sends message; Shift+Enter for newline
- Calls `chatbotAPI.sendMessage(message, conversationHistory)`

**`HeroCarousel.jsx`:**
Auto-advancing carousel (4-second interval). Touch swipe support. Respects `prefers-reduced-motion` — disables auto-advance when motion is reduced. Navigation dots at bottom. Used on homepage hero section when active promotions exist.

**`OtpStep.jsx`:**
OTP input field shown during registration. 6-digit input, countdown timer, resend button.

---

## PART 13: FRONTEND — INTERNATIONALIZATION

### `frontend/src/i18n/index.jsx`

i18next configuration:

```javascript
i18n
  .use(LanguageDetector)  // reads stored language from localStorage (key: 'hirftna_lang')
  .use(initReactI18next)  // connects to React
  .init({
    resources: { en: { translation: enJSON }, ar: { translation: arJSON } },
    fallbackLng: 'ar',         // default to Arabic
    interpolation: { escapeValue: false },  // React already escapes
  });
```

**`LanguageProvider`** wraps the app and synchronizes the HTML `dir` attribute:
```javascript
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = lang;
```

**`useTranslation()` return value:**
```javascript
const { t, lang, setLang, isRTL } = useTranslation();
```
`t('key')` — translates a key. `t('key', { variable: value })` — with interpolation.

---

### Translation Files

**Single namespace approach:** All keys are in one JSON file per language under the `translation` namespace. No multi-namespace setup.

**Key structure (nested):**
```json
{
  "common": { "appNameArabic": "حرفتنا", "appNameLatin": "MARKETPLACE" },
  "nav": { "home": "Home", "browse": "Browse" },
  "orders": { "title": "My Orders", "statuses": { "pending": "Pending Review" } },
  "customOrder": { "title": "Request Custom Order", "step1": "Requirements" },
  "notifications": {
    "types": {
      "new_order": "New order from {{clientName}}",
      "order_accepted": "{{shopName}} accepted your order"
    }
  },
  "categories": { "jewelry": "Jewelry", "pottery": "Pottery" },
  "payment": { "title": "Complete Payment", "ccpTransfer": "CCP Bank Transfer" },
  "chatbot": { "placeholder": "Ask me anything..." },
  "admin": { "dashboard": "Admin Dashboard", "verifyUser": "Verify" }
}
```

**How notification translations work:**
The notification `type` field (stored in the database) maps to a translation key. The `meta` JSONB field provides interpolation values:
```javascript
// Backend stores:
{ type: 'new_order', meta: { clientName: 'Ahmed' } }

// Frontend renders:
t(`notifications.types.new_order`, notification.meta)
// → "New order from Ahmed"
```

**How categories are translated:**
Category `slug` from the database (e.g. `"jewelry"`) maps to `categories.jewelry` in the translation file. The frontend never shows the raw English database value — it always uses `t('categories.' + category.slug)`.

**RTL support:**
When Arabic is active, all CSS logical properties flip automatically:
- `ps-3` (padding-start) → becomes right padding in RTL
- `pe-3` (padding-end) → becomes left padding in RTL
- `start-3.5` positioning → flips to right side
- `fadeInLeft` animation → swaps with `fadeInRight` via `[dir="rtl"]` CSS rule

---

## PART 14: FRONTEND — STYLING & DESIGN SYSTEM

### `tailwind.config.js`

**Custom color palette:**
```javascript
colors: {
  cream:   { 50: '#FFFDF7', 100: '#FDF9F3', 200: ..., 500: '#D6C4A8' },
  beige:   { 100: '#EDE0CC', 200: ..., 500: '#C4A882' },
  sage:    { 50: '#F0F4EE', 100: ..., 500: '#728C67', 700: '#4A6140', 900: '#2A3A26' },
  warm:    { 50: '#F5F2EC', 100: ..., 800: '#35322A', 900: '#1F1D17' },
  success: '#5C8A4A',  // green checkmarks
  warning: '#C4862A',  // stars, pending badges
  danger:  '#C0443A',  // errors, rejected status
  info:    '#3A6EA8',  // info badges, READY status
}
```

**Custom fonts:**
```javascript
fontFamily: {
  sans: ['"Plus Jakarta Sans"', '"Readex Pro"', 'system-ui', 'sans-serif'],
}
```
Readex Pro activates in RTL mode because it's listed second — when `[dir="rtl"]` is set, Arabic-optimized Readex Pro renders for Arabic characters.

---

### `frontend/src/index.css`

**Component classes:**
```css
.btn          → base button style (rounded-xl, px-6, py-2.5, font-semibold)
.btn-primary  → sage green background, white text
.btn-secondary → beige background, warm text
.btn-outline  → border + transparent background
.btn-danger   → red background

.card         → white background, rounded-2xl, shadow-sm, border beige-200
.card-hover   → card + hover:shadow-md + hover:-translate-y-0.5

.input        → text input: cream background, beige border, rounded-xl
.input-error  → red border for validation errors

.badge        → small pill badge
.badge-sage   → sage green badge (accepted, verified)
.badge-warning → amber badge (pending)
.badge-danger  → red badge (rejected)

.skeleton     → animated pulsing gray placeholder (background-size animation)
```

**Animation system:**
```css
@keyframes fadeInUp   { from: opacity 0, translateY 20px → to: opacity 1, translateY 0 }
@keyframes heartBeat  { 0%/100%: scale 1 → 50%: scale 1.3 }

.animate-fade-in-up    → 0.5s fadeInUp ease-out
.animate-heart-beat    → 0.3s heartBeat

.hover-lift            → :hover { transform: translateY(-4px); box-shadow: deeper; }
.reveal                → opacity: 0, transform: translateY(20px), transition: 0.6s
.reveal.in-view        → opacity: 1, transform: none  (triggered by IntersectionObserver)

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}

[dir="rtl"] .animate-fade-in-left  → swaps to fadeInRight
[dir="rtl"] .animate-fade-in-right → swaps to fadeInLeft
```

**The warm artisan aesthetic:**
Cream backgrounds (`#FDF9F3`) evoke handmade paper and natural materials. Sage green (`#728C67`) suggests natural dyes and plants. Brick red accents suggest terracotta pottery. Rounded corners (xl, 2xl) give a friendly, approachable feel. Soft shadows avoid harsh contrasts.

---

### `frontend/src/hooks/useInView.js`

```javascript
export function useInView(options = {}) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsInView(true); observer.disconnect(); } },
      { threshold: 0.1, ...options }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, isInView];
}
```

**Fire-once pattern:** `observer.disconnect()` is called after the first time the element enters the viewport. The animation plays once, not every time the element scrolls in and out.

Usage:
```jsx
const [ref, isInView] = useInView();
return <div ref={ref} className={`reveal ${isInView ? 'in-view' : ''}`}>...</div>
```

---

## PART 15: KEY WORKFLOWS (End-to-End Traces)

### Workflow 1: User Registration with OTP

```
1. User opens /register → RegisterPage shows form (name, email, password, role)

2. User clicks "Create Account"
   → authAPI.register({ email, password, full_name, role })
   → POST /api/v1/auth/register (auth.routes.js → auth.controller.js → auth.service.register())

3. Backend (auth.service.register):
   → supabasePublic.auth.signUp({ email, password })
   → Wait for on_auth_user_created trigger to create public.users row
   → Update users table with full_name, role
   → AUTH_OTP_ENABLED=true → generateOtpCode() [crypto.randomInt]
   → sendOtpEmail() [nodemailer SMTP]
   → Insert otp_sessions row with SHA256(otp), otp_token UUID, 10-minute expiry
   → Return { requires_otp: true, otp_token: "uuid-...", otp_expires_in: 600 }

4. Frontend receives { requires_otp: true }
   → AuthContext.register() stores pendingOtp = { otp_token, otp_expires_in }
   → RegisterPage switches to OTP input phase
   → Countdown timer shows 9:59...

5. User checks email, finds code "482931", types it in

6. User clicks "Verify Code"
   → authAPI.verifyOtp({ otp_token: "uuid-...", otp: "482931" })
   → POST /api/v1/auth/verify-otp

7. Backend (auth.service.verifyOtp):
   → Delete expired sessions
   → Load session by otp_token
   → Check attempts < 5
   → hashOtp("482931") → compare with stored hash using crypto.timingSafeEqual()
   → Match → delete session
   → supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true })
   → Return { user, token: null, refresh_token: null }

8. Frontend: navigate('/login', { state: { verified: true } })

9. LoginPage shows green banner: "Email verified! You can now log in."

10. User enters credentials → POST /auth/login → JWT token stored → logged in
```

---

### Workflow 2: Complete Custom Order Lifecycle

```
CLIENT SIDE:

1. Client browses BrowsePage, clicks on "Pottery Bowl" product
   → navigates to /products/932125a7-...

2. ProductPage loads → productsAPI.getById(id)
   → shows gallery, description, "500 – 2000 DA", seller info

3. Client clicks "Request Custom Order"
   → window.dispatchEvent('open-order-form', { product })
   → CustomOrderForm modal opens

4. Step 1 (Requirements):
   → notes: "I want a bowl with traditional Kabyle patterns, blue and white"
   → budget_min: 800, budget_max: 1500
   → deadline: 2026-06-15
   → Upload 2 reference images → POST /uploads/images → returns 2 Supabase URLs

5. Step 2 (Delivery): hand_to_hand, cash_on_delivery

6. Step 3 (Contact): name/phone/address pre-filled from profile

7. Submit → ordersAPI.create(payload)
   → POST /api/v1/orders
   → Backend: validateOrderItems → create order row (status=pending) → create order_items
   → Fire-and-forget notification to seller: { type: 'new_order', meta: { clientName: 'Ahmed' } }
   → Return created order

8. Client sees: "Order submitted! Waiting for seller response."

SELLER SIDE:

9. Seller's browser polls /notifications/unread-count every 120s
   → count changes from 0 to 1 → notification badge shows "1"

10. Seller opens NotificationsPage → sees "New order from Ahmed"
    → Clicks notification → navigates to /seller/orders

11. SellerOrdersPage shows order with status PENDING
    → Seller opens order detail → sees requirements + reference images + budget range

12. Seller clicks "Accept"
    → ordersAPI.updateStatus(orderId, { status: 'accepted' })
    → PATCH /api/v1/orders/:id/status
    → Backend: verify seller owns order → check transition (pending→accepted ✓)
    → Update status to 'accepted'
    → Notification to client: { type: 'order_accepted', meta: { shopName: 'Pottery Atelier' } }

CLIENT SIDE:

13. Client gets notification "Pottery Atelier accepted your order"
    → Client sees order status changed to ACCEPTED in OrdersPage

SELLER SIDE (after working on the product):

14. Seller finishes the bowl, clicks "Mark as Ready"
    → Opens "Mark Ready" form: final_price = 1200, delivery_type = hand_to_hand
    → ordersAPI.markReady(orderId, { final_price: 1200, delivery_type: 'hand_to_hand' })
    → PATCH /api/v1/orders/:id/ready
    → Backend: verify accepted status → update to 'ready' + final_price + ready_at
    → Notification to client: { type: 'order_ready', meta: { finalPrice: 1200, shopName: 'Pottery Atelier' } }

CLIENT SIDE:

15. Client gets notification "Your order is ready! Final price: 1200 DA"
    → Opens OrdersPage → order shows READY badge
    → Sees "Final Price: 1200 DA — Confirm to Complete"
    → Clicks "Confirm Complete"

16. PaymentStep modal opens (cash method selected):
    → Shows "Confirm you have received the product and paid 1200 DA"
    → Client checks the box → clicks "Complete Order"
    → ordersAPI.confirmComplete(orderId)
    → PATCH /api/v1/orders/:id/complete
    → Backend: verify client_id matches → verify ready status → update to 'completed' + completed_at
    → Notification to seller: { type: 'order_completed', meta: { clientName: 'Ahmed' } }
    → updateVerificationStatus(seller.id) — fire-and-forget

17. Both sides see COMPLETED status

18. Client sees "Rate Seller" button → opens ReviewSellerModal → POST /reviews/seller
    Seller sees "Rate Client" button → opens RateClientModal → POST /client-ratings
```

---

### Workflow 3: Product Creation

```
1. Seller navigates to /seller/products (RequireSeller guard passes)
   → SellerProducts.jsx loads → productsAPI.getMyProducts()
   → GET /products/my-products → returns seller's own products

2. Seller clicks "Add Product" → product creation form slides in

3. Seller fills form: name, description, category, price_min=500, price_max=2000,
   completion_days=14

4. Seller selects 3 images → click upload
   → uploadsAPI.uploadImages([file1, file2, file3])
   → POST /uploads/images (multipart/form-data)
   → multer parses files → file-type validates MIME → sharp resizes → Supabase Storage upload
   → Returns [url1, url2, url3]

5. Seller submits form
   → productsAPI.create({ name, description, category_id, price_min, price_max,
      completion_days, images: [url1, url2, url3] })
   → POST /api/v1/products
   → Backend: product.service.createProduct()
     → Insert products row
     → Insert product_images rows (position 0 = first image = cover)
   → Return created product

6. Product grid refreshes → new product appears
   → Product is immediately visible on public browse page
   (no verification gate — all products are publicly visible)
```

---

### Workflow 4: Admin Grants Promotion

```
1. Seller opens /seller/promotions → SellerPromotions.jsx
   → promotionsAPI.getMe() → GET /promotions/me → no active promotion

2. Seller selects: Hero placement, 14 days
   → Clicks "Submit Request"
   → promotionsAPI.request({ placement: 'hero', requested_days: 14 })
   → POST /promotions/request
   → Backend: check no existing pending/active promotion → insert { status: 'pending' }

3. PaymentModal opens → shows CCP transfer details
   → Seller declares payment sent → closes modal

4. Admin logs into /admin/promotions
   → AdminPromotions.jsx → adminAPI.getPromotions({ status: 'pending' })
   → Shows pending promotion: "Pottery Atelier — Hero — 14 days"

5. Admin clicks "Activate"
   → adminAPI.activatePromotion(promotionId)
   → PATCH /admin/promotions/:id/activate
   → Backend: update { status: 'active', is_active: true, starts_at: now, ends_at: now+14days }
   → Notification to seller: { type: 'promotion_activated', meta: { days: 14, placement: 'hero' } }

6. Seller gets notification "Your promotion is now active for 14 days!"
   → SellerPromotions shows countdown: "12 days remaining"

7. Homepage loads → promotionsAPI.getHeroAds()
   → Returns "Pottery Atelier" promotion
   → Hero section shows HeroCarousel with seller's shop card
```

---

### Workflow 5: Search & Browse Products

```
1. User types "pottery" in TopBar search → presses Enter
   → navigate('/browse?search=pottery')

2. BrowsePage mounts → reads URL params → sets filters.search = 'pottery'
   → productsAPI.getAll({ search: 'pottery', page: 1, limit: 20 })
   → GET /products?search=pottery&page=1&limit=20

3. Backend (product.service.getAllProducts):
   → Builds Supabase query on products table
   → Applies: .textSearch('fts', query, { type: 'websearch' }) for full-text search
   → Joins: seller (id, shop_name, is_verified, avg_rating), category, product_images
   → Applies pagination: .range(0, 19)
   → Returns { products: [...], pagination: { total: 47, page: 1, limit: 20 } }

4. BrowsePage renders 20 ProductCards + pagination (3 pages for 47 results)

5. User clicks category "Pottery" in sidebar
   → updates URL: ?search=pottery&category_id=<uuid>
   → new API call with added category filter

6. User clicks page 2 → ?page=2
   → new API call → next 20 products
```

---

## PART 16: SECURITY IMPLEMENTATION

### 1. JWT Authentication
- Tokens issued by Supabase Auth (RS256 signed)
- Verified by `supabasePublic.auth.getUser(token)` — validates signature and expiry
- Tokens expire after Supabase's configured period (typically 1 hour)
- Refresh tokens persist sessions — `auth.service.refreshToken()` issues new tokens
- Token stored in `localStorage` (not cookies, to avoid CSRF concerns)

### 2. OTP Two-Factor Authentication
- Generated with `crypto.randomInt(100000, 1000000)` — OS-level CSPRNG
- SHA256 hashed before storage — plaintext OTP never persists
- Compared with `crypto.timingSafeEqual()` — prevents timing oracle attacks
- 10-minute TTL — expired sessions auto-deleted before new ones are created
- Maximum 5 attempts — session locked and deleted on 6th failure
- Sent via SMTP email — requires SMTP credentials in `.env`

### 3. Password Security
- Handled by Supabase Auth (bcrypt hashing with configurable cost factor)
- Password change requires current password verification
- Reset flow uses 32-byte cryptographically random hex tokens (64 hex chars)
- Reset tokens: 15-minute TTL, single-use (deleted immediately on use)

### 4. Rate Limiting
| Limiter | Rate | Key | Purpose |
|---------|------|-----|---------|
| globalLimiter | 500/15min | IP | General API protection |
| publicReadLimiter | 2000/15min | IP | Browse/product endpoints |
| authLimiter | 30/15min | IP (failed only) | Brute force login protection |
| forgotPasswordLimiter | 5/15min | IP | Reset email spam prevention |
| uploadLimiter | 20/15min | user.id | Per-user upload protection |
| chatbotLimiter | 20/hour | user.id | Gemini API cost protection |

`trust proxy: 1` ensures real client IPs are used for rate limiting, not the Render proxy IP.

### 5. Input Validation (Zod)
- Every POST/PUT/PATCH endpoint has a Zod validator
- Controllers access only `req.validated.body` — never `req.body` directly
- Protects against: oversized strings, wrong types, missing required fields, invalid enums, SQL injection (Supabase uses parameterized queries)

### 6. CORS
- Only `CLIENT_URL` (Vercel production URL) and localhost (development) are allowed
- `credentials: true` for Authorization headers
- 403 returned for blocked origins (not silently dropped)

### 7. HTTP Security Headers (Helmet)
Helmet sets 15 headers automatically including:
- `Content-Security-Policy` — prevents XSS
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Strict-Transport-Security` — forces HTTPS

### 8. Ownership Checks
Every mutating endpoint verifies the requester owns the resource:
- Orders: `order.seller_id !== seller.id` → 403
- Products: `product.seller_id !== seller.id` → 403
- `confirmComplete`: `order.client_id !== userId` → 403
- Notifications: `notification.user_id !== userId` → 403

### 9. HPP (HTTP Parameter Pollution)
`hpp()` middleware removes duplicate query parameters. Without it, `?sort=price&sort=rating` could cause array injection in some frameworks.

### 10. File Upload Security
- `file-type` library validates magic bytes (not just extension or MIME header)
- Only allows: `image/jpeg`, `image/png`, `image/webp`
- Maximum 5MB per file, 5 files per request
- Per-user rate limit: 20 uploads per 15 minutes
- Images processed with `sharp` before storage (strips EXIF, normalizes format)

---

## PART 17: DEPLOYMENT ARCHITECTURE

### Frontend on Vercel

`vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
This SPA routing configuration is critical — without it, navigating directly to `/seller/dashboard` returns 404 from Vercel's CDN. The rewrite sends all paths to `index.html`, letting React Router handle navigation client-side.

Vite builds the app into `dist/` with:
- JS bundle: `dist/assets/index-BMm_zHkr.js` (hashed filename for cache busting)
- CSS bundle: `dist/assets/index-lFXMTN7s.css`

The `VITE_API_URL` build guard in `api.js` — if `VITE_API_URL` is not set in Vercel environment variables and the build is in production, the IIFE throws an error, preventing deployment of a broken app.

**Auto-deploy:** Push to `main` branch → Vercel automatically builds and deploys in ~2 minutes.

---

### Backend on Render (Free Tier)

Start command: `node src/server.js`

**Cold start problem:** Render's free tier spins down the server after 15 minutes of inactivity. The first request after spin-down takes ~30 seconds to boot. This means users who visit the site after it's been idle experience a slow initial load. Solutions: upgrade to paid tier, or use an uptime monitor to ping the health endpoint every 10 minutes.

The `GET /health` endpoint is excluded from rate limiting and morgan logging (`skip: (req) => req.path === '/health'`).

**Environment variables** are set in Render's dashboard (not in `.env` file — that's only for local development).

---

### Database on Supabase

- PostgreSQL 15 hosted in EU West region
- Connection from Render to Supabase uses the Supabase JS client (connection pooling built-in)
- Storage buckets `product-images` and `avatars` are set to public — URLs are CDN-distributed
- Auth service issues JWT tokens; the backend verifies them without calling the Supabase Auth API for every request (JWT is self-contained — signature verification is local)

Actually the backend DOES call `supabasePublic.auth.getUser(token)` for every request — this verifies the token with Supabase's Auth server. This is more secure than local verification (catches immediately revoked tokens) but adds ~100-200ms latency. The 6-second timeout in `auth.middleware.js` handles Supabase Auth slowness.

---

## PART 18: COMMON JURY QUESTIONS & ANSWERS

### Architecture

**Q: Why did you separate backend and frontend?**
The separation follows the Single Responsibility Principle. The backend is a pure REST API — it processes data and enforces business rules. The frontend is a presentation layer — it renders UI and manages user interactions. This allows them to be deployed independently, scaled separately, and developed by different people. It also means the API could be consumed by a mobile app in the future without changing any backend code.

**Q: Why Supabase instead of setting up your own PostgreSQL server?**
Supabase gives us three things in one: a PostgreSQL database, an authentication service (email/password, JWT tokens, password reset), and file storage (for product images). Setting up all three separately would require a database server, a separate auth service (Passport.js, Auth0, etc.), and a file server (S3, etc.) with their own configurations, hosting costs, and integration work. Supabase's free tier covers all of this for an MVP, and the Supabase JS client makes all three feel like one service.

**Q: Why Express instead of NestJS or Fastify?**
Express is the simplest choice for a team learning Node.js. NestJS adds Angular-style decorators and dependency injection — powerful for large teams but heavy for an MVP. Fastify is faster but has a smaller ecosystem. Express is universally known, extensively documented in Arabic/French as well as English, and gives us full control over middleware ordering — which matters for security (helmet must come before cors, rate limiters must come after trust proxy).

**Q: How does your API handle errors?**
All errors flow through the global `errorHandler` in `error.middleware.js`. The `AppError` class lets services throw typed errors with HTTP status codes: `throw new AppError('Order not found', 404)`. The error handler converts these to standardized JSON: `{ success: false, message: '...', errors: null }`. In production, unexpected errors return "Internal server error" instead of stack traces — security best practice.

**Q: What design pattern does your backend follow?**
The MVC-adjacent pattern: Models are represented by Supabase tables (no ORM), Views are the JSON responses, Controllers handle HTTP (parse request, call service, send response), and Services contain all business logic. This is also called the Service Layer pattern or Layered Architecture. The key principle: controllers never contain business logic, services never know about HTTP.

---

### Authentication

**Q: How does JWT authentication work in your project?**
When a user logs in, Supabase Auth verifies their password and issues two tokens: an access token (JWT, expires in ~1 hour) and a refresh token (long-lived, opaque). The access token is stored in `localStorage`. Every API request includes it in the `Authorization: Bearer <token>` header. The backend's `authenticate` middleware calls `supabasePublic.auth.getUser(token)` — Supabase verifies the JWT signature and returns the user ID. The middleware then loads the full profile from our `public.users` table (to get the role). This two-step verification (Supabase Auth → our DB) is more secure than just decoding the JWT locally.

**Q: Why did you implement OTP? How does it work?**
OTP (One-Time Password) is a form of email verification that confirms the user actually controls the email address they registered with. Without it, someone could register with a fake email and access the platform. The flow: user registers → we generate a 6-digit code using `crypto.randomInt()` (cryptographically secure) → send it via email → store a SHA256 hash (never the code itself) in `otp_sessions` → user submits the code → we hash it and compare with `crypto.timingSafeEqual()` → if match, confirm the email in Supabase Auth.

**Q: What happens when a token expires?**
The React `api.js` response interceptor catches 401 responses. It sends the stored refresh token to `POST /auth/refresh`. If the refresh succeeds, the new access token is stored and the original request is retried automatically. All other requests that arrived during the refresh wait in a queue and replay once the token is refreshed. If the refresh token is also expired, `localStorage` is cleared and the user is redirected to `/login`.

**Q: How do you prevent brute force attacks on login?**
The `authLimiter` rate limiter allows 30 requests per 15 minutes per IP. Crucially, `skipSuccessfulRequests: true` means only FAILED attempts count. An attacker trying to guess passwords gets locked out after 30 failed attempts for 15 minutes. The login route is also protected by the `globalLimiter` (500 req/15min). The `forgotPassword` route has its own strict limiter: 5 requests per 15 minutes.

---

### Custom Orders

**Q: Explain the complete order lifecycle.**
A client submits a custom order (requirements, budget range, deadline, reference images) → seller receives a notification and sees the order as PENDING → seller accepts (ACCEPTED) or rejects with a reason (REJECTED) → seller works on the product → seller marks it READY and sets the final price → client sees the final price and confirms completion (COMPLETED) → both parties can now rate each other. Each transition sends a notification to the other party. Invalid transitions (e.g. jumping from pending to completed) are rejected by the `VALID_TRANSITIONS` map in `order.service.js`.

**Q: Why a custom order system instead of a traditional cart?**
Algerian artisans make unique, handmade items. Prices cannot be fixed in advance — they depend on the specific requirements (size, materials, complexity, customizations). A traditional cart (fixed price, add to cart, checkout) doesn't make sense for a bespoke item. The custom order system mirrors how artisans actually work: client describes what they want → artisan quotes a price → client confirms.

**Q: How do you ensure only the seller can accept an order?**
In `order.service.updateOrderStatus()`, after verifying the JWT (user is authenticated), we load the seller profile: `SELECT id FROM sellers WHERE user_id = req.user.id`. Then we check: `if (order.seller_id !== seller.id) throw new AppError('Forbidden', 403)`. The `seller_id` on the order is set at order creation time from the product's seller — it cannot be changed. So even if someone knew another seller's order ID, they couldn't accept it.

**Q: What happens if a seller rejects an order?**
The order status becomes `rejected`. The `rejection_reason` field (required when rejecting) is stored in the `orders` table. A notification is sent to the client with the reason in `meta.rejectionReason`. The client sees the rejection reason in their `OrdersPage`. The `rejected` status is terminal — no further transitions are possible.

---

### Security

**Q: What security measures did you implement?**
1. JWT authentication via Supabase Auth. 2. OTP 2FA for email verification on registration. 3. Bcrypt password hashing (handled by Supabase Auth). 4. Rate limiting on all endpoints (multiple limiters for different risk profiles). 5. Zod input validation on every mutating endpoint. 6. CORS whitelist (only our frontend domain). 7. Helmet for 15 security headers (XSS protection, clickjacking prevention, etc.). 8. `trust proxy` for correct IP-based rate limiting on Render. 9. Ownership checks before every update/delete. 10. Role-based access control via `requireRole()`. 11. HPP (parameter pollution protection). 12. File type validation with magic bytes (not just extensions). 13. Timing-safe OTP comparison to prevent oracle attacks.

**Q: How does rate limiting work? Why different limits for different endpoints?**
Rate limiting uses the `express-rate-limit` library, which tracks request counts per IP in memory. Different limits reflect different risk profiles: Public browsing (`/categories`, `/products`) needs a high limit (2000/15min) because users browse constantly. Login needs a strict limit (30/15min, failures only) to prevent brute-force attacks. Chatbot needs a per-user hourly limit to control Gemini API costs. Upload gets a per-user 15-minute limit to prevent storage abuse.

**Q: How do you validate user input?**
Every POST/PUT/PATCH route has a Zod schema. The `validate()` middleware parses the request body against the schema — if parsing fails, it throws a ZodError which the error handler converts to a 400 response with field-level error details. Controllers only ever read `req.validated.body` (never `req.body`). Zod schemas enforce types, lengths, formats (email, UUID, enum values), and required vs. optional fields.

**Q: How do you prevent a user from accessing another user's data?**
Every service function that fetches or modifies user-specific data checks ownership. For example, in `getOrderById`: a client can only access orders where `order.client_id === userId`. A seller can only access orders where `order.seller_id === seller.id`. This check happens in the service layer (business logic), separate from the authentication layer (is this person logged in?) and the authorization layer (do they have the right role?).

---

### Payment

**Q: How does the payment system work?**
There are two payment flows: 1) **Client pays seller** (order completion) — when the seller marks an order READY with a final price, the client confirms completion through `PaymentStep`. For cash: client confirms they received the product and paid. For card: simulated Chargily payment (2-second spinner). 2) **Seller pays platform** (promotion fee) — the seller submits a CCP bank transfer through `PaymentModal`, then an admin manually verifies and activates the promotion.

**Q: Why is Chargily simulated and not real?**
Chargily (Algeria's payment gateway) requires a business license and Chargily merchant account. For an academic project MVP, we simulate the payment flow (the UI is complete with real Chargily-style steps) to demonstrate the payment concept without needing real credentials. The CONTEXT.md explicitly notes "STRIPE IS NOT USED — use Chargily for Algerian payments."

**Q: What would you need to change to make payments real?**
In `PaymentStep.jsx`, replace the `setTimeout(2000)` simulation with a real Chargily API call: create a payment intent via `POST https://pay.chargily.net/api/v2/payment-intents`, redirect the user to the Chargily checkout URL, then handle the webhook callback on the backend (which would then call `confirmComplete`). The `CHARGILY_SECRET_KEY` and `CHARGILY_WEBHOOK_SECRET` environment variables are already defined and ready.

---

### Internationalization

**Q: How do you handle Arabic/English translation?**
`react-i18next` library. All displayed text uses `t('key')` — never hardcoded strings. Two JSON files (`en.json`, `ar.json`) contain all translations. Language preference is stored in `localStorage` under key `hirftna_lang`. Switching language calls `i18n.changeLanguage(lang)` and updates `document.documentElement.lang` attribute.

**Q: How does RTL work in your project?**
When Arabic is active, `LanguageProvider` sets `document.documentElement.dir = 'rtl'`. TailwindCSS uses CSS logical properties: `ps-3` (padding-start) and `pe-3` (padding-end) automatically flip in RTL. Input icons use `start-3.5` and `end-3.5` positioning. The animation system's `fadeInLeft` and `fadeInRight` are swapped via `[dir="rtl"]` CSS rules.

**Q: How do you translate database content (categories)?**
Category names are stored in English in the database (e.g. `"Jewelry"`). Each category has a `slug` (e.g. `"jewelry"`). The frontend maps the slug to a translation key: `t('categories.' + category.slug)`. This returns "Jewelry" in English or "مجوهرات" in Arabic. The database is the source of truth for categories; the translation files add the localized display names.

---

### Database

**Q: Explain your database schema.**
16 tables connected by foreign keys. Core entities: `users` (all accounts), `sellers` (extended profile for seller role), `products` (items listed by sellers with price ranges), `orders` (custom order requests with full lifecycle tracking), `reviews` and `ratings` (two-way rating system), `notifications` (system events). Supporting tables: `categories`, `product_images`, `wishlist`, `otp_sessions`, `password_reset_tokens`, `promotions`, `subscriptions`, `client_ratings`.

**Q: Why these specific tables?**
Each table represents a single concept. `users` and `sellers` are separate because not all users are sellers — a 1:0-or-1 relationship where sellers have additional profile fields. `reviews` and `ratings` are separate because one rates a product, the other rates a seller. `client_ratings` is a third table for the reverse direction. `notifications` are stored in the database (not in-memory) so they persist across sessions and across devices.

**Q: How are orders related to products and users?**
`orders.client_id → users.id` (who placed it), `orders.seller_id → sellers.id` (which shop received it). A separate `order_items` table handles the many-to-many: one order can have multiple products, one product can appear in many orders. `order_items.unit_price` stores a snapshot of the price at order time — even if the seller changes the product price later, the historical order record is preserved.

**Q: What triggers do you have and why?**
4 triggers: `on_auth_user_created` (auto-creates a `public.users` row when Supabase Auth creates a user), `trg_product_avg_rating` (auto-recalculates `products.avg_rating` when a review changes), `trg_seller_avg_rating` (auto-recalculates `sellers.avg_rating` when a rating changes), `trg_seller_subscription` (auto-creates a free subscription when a seller profile is created). Triggers keep derived data in sync without requiring application-level logic to do so explicitly.

---

### Frontend

**Q: How does state management work without Redux?**
React's built-in Context API + `useState` + `useCallback` + `useMemo` handles all state. `AuthContext` manages authentication state globally. Individual pages manage their own local state (loading/data/error). The `useApi` hook (which returns the API modules) provides access to the API layer. This is simpler than Redux for an app of this scale — Redux would add boilerplate without benefit. If the app grew to 50+ components sharing complex state, Redux or Zustand would be appropriate.

**Q: How does your routing system handle authentication?**
React Router v7 with custom guard components (`RequireAuth`, `RequireSeller`, etc.). Each guard reads auth state from `useAuth()`. During initial hydration (loading=true), guards show a blank cream screen instead of flashing a redirect. After hydration, if conditions aren't met, they redirect with `<Navigate to="/login" state={{ from: location }} replace />`. The `state.from` preserves the original URL so after login the user is sent back to where they wanted to go.

**Q: How do you handle loading and error states?**
Three states for every data-fetching component: loading (skeleton/spinner), error (error banner with retry button), empty (empty state illustration). All pages have `isLoading` boolean and `fetchError` state. Loading: renders `<ProductSkeleton />` or `<Spinner />`. Error: renders `<ErrorBanner message={fetchError} onRetry={fetchData} />`. Empty: renders an illustrative empty state message.

**Q: Why TailwindCSS instead of regular CSS or Bootstrap?**
Regular CSS requires inventing class names (BEM conventions) and managing specificity conflicts. Bootstrap imposes a specific look (the Bootstrap aesthetic) that's hard to override. Tailwind gives atomic utility classes that compose into any design — our warm artisan aesthetic (cream/sage colors, custom fonts, rounded corners) couldn't be achieved as naturally with Bootstrap. Tailwind's configuration in `tailwind.config.js` extends the default theme with our custom palette, making brand colors available everywhere as utilities (`bg-sage-500`, `text-warm-800`).

---

### Deployment

**Q: How is the project deployed?**
Frontend: pushed to GitHub → Vercel auto-builds from `main` branch → Vite builds SPA → deploys to CDN. URL: `https://hirftna.vercel.app`. Backend: pushed to GitHub → Render auto-builds → starts with `node src/server.js`. URL: `https://hirftna-backend.onrender.com`. Database: Supabase (cloud, EU West) — always on, managed service.

**Q: What is the cold start problem and how do you handle it?**
Render's free tier shuts down the Node.js server after 15 minutes of no traffic. The first request after shutdown triggers a cold start: Node boots, loads modules, connects to Supabase — about 30 seconds. Users experience a slow initial load. Our solution for MVP: document this limitation in the project notes. Production solution: upgrade to Render's Starter plan ($7/month) which keeps the server always running.

**Q: What happens when you push code to GitHub?**
GitHub triggers Vercel's webhook (frontend) and Render's webhook (backend) simultaneously. Vercel runs `npm run build` (Vite), checks for build errors, then deploys the new `dist/` to CDN. Render pulls the new code, installs dependencies (`npm install`), and starts the new server instance. Both deployments take about 2–3 minutes. Zero-downtime deployment: Render keeps the old instance running until the new one is healthy.
