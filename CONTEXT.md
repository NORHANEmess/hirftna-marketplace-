# HIRFTNA MARKETPLACE — Master Project Context
# This file is the single source of truth for the entire project.

# Reference this file in every AI interaction using @CONTEXT.md
# Update the progress tracker after every completed file.

---

## PROJECT IDENTITY

- **Name:** Hirftna Marketplace
- **Type:** Intelligent marketplace with custom-order system for Algerian artisans
- **Purpose:** Connect artisans and small businesses with clients through a structured, trustworthy system
- **Core Innovation:** Custom Order System — no direct chat between client and seller; all negotiation happens through the structured order flow
- **Security Upgrade:** Two-Factor Authentication (2FA via OTP email)
- **Stage:** MVP Development
- **Timeline:** 1 months

---

## CORE BUSINESS LOGIC (READ FIRST)

```
✅ No direct chat between client and seller
✅ All custom interactions go through the Custom Order system
✅ Chatbot is an assistant ONLY (not a negotiation tool)
✅ Seller responds via order status (not messaging)
✅ Wishlist works for BOTH clients AND sellers
✅ Custom Order replaces the messaging/chat feature entirely
✅ Final price is determined by the seller AFTER accepting the order
✅ The "messages" table and any chat feature are REMOVED from this project
```

---

## CUSTOM ORDER FLOW (CANONICAL)

```
Step 1 — Client submits a Custom Order
         (product_id, budget_min, budget_max, deadline,
          reference_images, delivery_type, payment_method, notes)
         → Order status: PENDING
         → Notification → seller: "new_order"

Step 2 — Seller reviews and responds
         → ACCEPT: status becomes ACCEPTED
           → Notification → client: "order_accepted"
         → REJECT: status becomes REJECTED + rejection_reason
           → Notification → client: "order_rejected"

Step 3 — Seller works on the order

Step 4 — Seller marks order as READY
         → PATCH /api/v1/orders/:id/ready
         → Sets: final_price, delivery_method (confirmed), ready_at
         → Status becomes READY
         → Notification → client: "order_ready"

Step 5 — Client reviews final details
         (final price + delivery method shown to client)

Step 6 — Client confirms order completion
         → PATCH /api/v1/orders/:id/complete
         → Status becomes COMPLETED
         → Sets: completed_at
         → Notification → seller: "order_completed"

Step 7 — BOTH sides rate each other (after completion only)
         → Client rates Seller → POST /api/v1/reviews/seller
         → Seller rates Client → POST /api/v1/client-ratings
```

---

## TECHNOLOGY STACK

### Backend
- **Runtime:** Node.js v20+
- **Framework:** Express.js v5
- **Language:** JavaScript (no TypeScript)
- **Validation:** Zod
- **Logging:** Winston
- **Auth:** Supabase Auth + JWT verification
- **2FA:** OTP via email (Resend), in-memory sessions (10min TTL), max 5 attempts

### Database & Services
- **Database:** Supabase (PostgreSQL 15)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage (buckets: product-images, avatars)
- **Realtime:** Supabase Realtime (notifications)

### Frontend
- **Framework:** React 18 (Vite)
- **Styling:** TailwindCSS
- **Routing:** React Router v6
- **Language:** JavaScript

### External Services
- **AI Chatbot:** Gemini (free tier) or equivalent free AI API
- **Payments:** Chargily (Algerian payment gateway — optional, frontend only)
- **Email:** Resend (OTP + notifications)

> ⚠️ STRIPE IS NOT USED. This is an Algerian platform — use Chargily for payments.
> ⚠️ OPENAI IS NOT USED. Use Gemini or another free AI for the chatbot.

---

## PROJECT STRUCTURE

```
hirftna-marketplace/
├── CONTEXT.md                  ← single source of truth
├── backend/                    ← Node.js/Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js          ← validates environment variables
│   │   │   └── supabase.js     ← supabasePublic + supabaseAdmin clients
│   │   ├── controllers/        ← handle req/res, call services
│   │   ├── routes/             ← define API endpoints
│   │   ├── services/           ← business logic, DB queries
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js      ← verify JWT token
│   │   │   ├── role.middleware.js      ← check user role
│   │   │   ├── validate.middleware.js  ← Zod validation
│   │   │   └── error.middleware.js     ← global error handler + AppError
│   │   ├── utils/
│   │   │   ├── logger.js       ← Winston logger
│   │   │   └── response.js     ← standardized API responses
│   │   ├── validators/         ← Zod schemas per feature
│   │   ├── app.js              ← Express app + middleware setup
│   │   └── server.js           ← entry point
│   ├── logs/
│   ├── .env
│   ├── .env.example
│   └── package.json
└── frontend/                   ← React app
    └── src/
        ├── pages/
        ├── services/
        │   └── api.js          ← Axios client + all API methods
        └── utils/
            └── validation.js   ← payload parsers
```

---

## SUPABASE CONFIGURATION

```
Project URL:  https://azjeomrahtmaeergfffh.supabase.co
Project ID:   azjeomrahtmaeergfffh
Region:       EU West
```

### Storage Buckets
| Bucket Name    | Access | Purpose                      |
|----------------|--------|------------------------------|
| product-images | Public | Product photos               |
| avatars        | Public | User / seller profile images |

### Two Supabase Clients (backend only)
```javascript
supabasePublic   // verify user JWT tokens (ANON key)
supabaseAdmin    // all database operations (SERVICE ROLE key)
// NEVER expose SERVICE ROLE key to frontend
```

---

## DATABASE SCHEMA — ALL 16 TABLES

### 1. users
```
id            UUID  PK  (mirrors auth.users.id)
email         TEXT  NOT NULL UNIQUE
full_name     TEXT
phone         TEXT
avatar_url    TEXT
role          TEXT  CHECK ('client','seller','admin') DEFAULT 'client'
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()
```

### 2. sellers
```
id            UUID  PK
user_id       UUID  FK → users.id UNIQUE
shop_name     TEXT  NOT NULL
description   TEXT
bio           TEXT
story         TEXT  (Markdown — artisan backstory)
location      TEXT
city          TEXT
category_id   UUID  FK → categories.id
avatar_url    TEXT
is_verified   BOOL  DEFAULT false
avg_rating    NUMERIC(3,2) DEFAULT 0
total_sales   NUMERIC(12,2) DEFAULT 0
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```

### 3. categories
```
id            UUID  PK
name          TEXT  NOT NULL UNIQUE
slug          TEXT  NOT NULL UNIQUE
icon_url      TEXT
created_at    TIMESTAMPTZ
```
Pre-filled: Jewelry, Pottery, Textiles, Paintings, Leather Goods, Candles & Soap, Food & Honey, Home Decor, Other

### 4. products
```
id              UUID  PK
seller_id       UUID  FK → sellers.id
category_id     UUID  FK → categories.id
name            TEXT  NOT NULL
description     TEXT
price           NUMERIC(10,2)          (legacy / fallback)
price_min       NUMERIC(10,2)          (minimum price range)
price_max       NUMERIC(10,2)          (maximum price range)
completion_days INTEGER                 (estimated days to complete)
avg_rating      NUMERIC(3,2) DEFAULT 0
view_count      INTEGER DEFAULT 0
is_active       BOOL  DEFAULT true
is_featured     BOOL  DEFAULT false
is_new          BOOL  DEFAULT false
fts             TSVECTOR               (auto full-text search)
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```
> ⚠️ No `stock` field — this is a custom-order platform. Products are made-to-order.

### 5. product_images
```
id            UUID  PK
product_id    UUID  FK → products.id
image_url     TEXT  NOT NULL  (Supabase Storage URL)
position      INTEGER DEFAULT 0  (0 = cover image)
created_at    TIMESTAMPTZ
```

### 6. orders
```
id               UUID  PK
client_id        UUID  FK → users.id
seller_id        UUID  FK → sellers.id
status           TEXT  CHECK ('pending','accepted','rejected','ready','completed')
total_amount     NUMERIC(10,2)
final_price      NUMERIC(10,2)          (set by seller when marking READY)
delivery_type    TEXT  CHECK ('fast','office_pickup','hand_to_hand')
payment_method   TEXT  CHECK ('card','cash_on_delivery')
client_name      TEXT
client_phone     TEXT
client_address   TEXT
notes            TEXT
budget_min       NUMERIC(10,2)          (client's stated budget range)
budget_max       NUMERIC(10,2)
deadline         DATE                   (client's requested deadline)
reference_images TEXT[]                 (array of image URLs)
rejection_reason TEXT                   (required if status = rejected)
is_custom        BOOL  DEFAULT true
ready_at         TIMESTAMPTZ            (when seller marked READY)
completed_at     TIMESTAMPTZ            (when client confirmed COMPLETED)
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

**Valid Status Transitions:**
```
pending   → accepted | rejected
accepted  → ready
ready     → completed
rejected  → (terminal)
completed → (terminal)
```

### 7. order_items
```
id            UUID  PK
order_id      UUID  FK → orders.id
product_id    UUID  FK → products.id
quantity      INTEGER NOT NULL
unit_price    NUMERIC(10,2)  (snapshot at time of order)
created_at    TIMESTAMPTZ
```

### 8. reviews
```
id            UUID  PK
product_id    UUID  FK → products.id
client_id     UUID  FK → users.id
rating        INTEGER CHECK (1-5)
comment       TEXT
created_at    TIMESTAMPTZ
UNIQUE (product_id, client_id)
```

### 9. ratings (seller ratings by clients)
```
id            UUID  PK
seller_id     UUID  FK → sellers.id
client_id     UUID  FK → users.id
rating        INTEGER CHECK (1-5)
created_at    TIMESTAMPTZ
UNIQUE (seller_id, client_id)
```

### 10. client_ratings (client ratings by sellers — NEW)
```
id            UUID  PK
order_id      UUID  FK → orders.id UNIQUE
seller_id     UUID  FK → sellers.id  (the rater)
client_id     UUID  FK → users.id    (the rated)
rating        INTEGER CHECK (1-5)
comment       TEXT
created_at    TIMESTAMPTZ
UNIQUE (order_id, seller_id)
```
> Only allowed after order status = 'completed'. One rating per order per seller.

### 11. wishlist
```
id            UUID  PK
user_id       UUID  FK → users.id
product_id    UUID  FK → products.id
created_at    TIMESTAMPTZ
UNIQUE (user_id, product_id)
```
> Available to all authenticated users (clients AND sellers).

### 12. notifications
```
id            UUID  PK
user_id       UUID  FK → users.id
type          TEXT  CHECK (
                'new_order',
                'order_accepted',
                'order_rejected',
                'order_ready',
                'order_completed',
                'system'
              )
title         TEXT  NOT NULL
body          TEXT
is_read       BOOL  DEFAULT false
meta          JSONB DEFAULT '{}'
created_at    TIMESTAMPTZ
```

> ⚠️ The `message` notification type is REMOVED — there is no chat feature.

### 13. subscriptions
```
id              UUID  PK
seller_id       UUID  FK → sellers.id UNIQUE
plan            TEXT  CHECK ('free','chatbot')
stripe_sub_id   TEXT   (reserved — not used, Chargily is planned)
stripe_cust_id  TEXT   (reserved)
is_active       BOOL  DEFAULT false
started_at      TIMESTAMPTZ
expires_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### 14. promotions
```
id            UUID  PK
seller_id     UUID  FK → sellers.id
product_id    UUID  FK → products.id  (null = seller-level promotion)
placement     TEXT  CHECK ('homepage','featured','category_top')
starts_at     TIMESTAMPTZ
ends_at       TIMESTAMPTZ
is_active     BOOL  DEFAULT true
stripe_pi     TEXT   (reserved)
created_at    TIMESTAMPTZ
```

### 15. browsing_events
```
id            UUID  PK
user_id       UUID  FK → users.id  (nullable for visitors)
product_id    UUID  FK → products.id
event_type    TEXT  CHECK ('view','cart','wishlist','purchase')
occurred_at   TIMESTAMPTZ DEFAULT now()
```

### 16. (REMOVED) messages
```
REMOVED — there is no direct chat between clients and sellers.
All communication happens through the Custom Order system.
```

---

## DATABASE TRIGGERS (auto-configured in Supabase)

```
1. on_auth_user_created
   → fires after INSERT on auth.users
   → creates a row in public.users automatically

2. trg_product_avg_rating
   → fires after INSERT/UPDATE/DELETE on reviews
   → recalculates products.avg_rating

3. trg_seller_avg_rating
   → fires after INSERT/UPDATE/DELETE on ratings
   → recalculates sellers.avg_rating

4. trg_seller_subscription
   → fires after INSERT on sellers
   → creates a free subscription row automatically
```

---

## USER ROLES & PERMISSIONS

### visitor (not logged in)
```
✅ GET  /api/v1/products           browse products (filters + pagination)
✅ GET  /api/v1/products/:id       view product detail
✅ GET  /api/v1/sellers            browse verified sellers
✅ GET  /api/v1/sellers/:id        view seller profile + products
✅ GET  /api/v1/categories         view categories
✅ GET  /api/v1/reviews/product/:id  view product reviews
✅ GET  /api/v1/reviews/seller/:id   view seller ratings
❌ cannot place orders
❌ cannot write reviews
❌ cannot rate sellers or clients
```

### client (logged in, role = 'client')
```
✅ everything visitors can do
✅ POST   /api/v1/orders              place custom orders
✅ GET    /api/v1/orders              view own orders
✅ GET    /api/v1/orders/:id          view order detail
✅ PATCH  /api/v1/orders/:id/complete confirm order completion (→ COMPLETED)
✅ POST   /api/v1/reviews/product     write product reviews
✅ POST   /api/v1/reviews/seller      rate sellers (after order completion)
✅ POST   /api/v1/wishlist            add to wishlist
✅ GET    /api/v1/wishlist            view wishlist
✅ DELETE /api/v1/wishlist/:id        remove from wishlist
✅ POST   /api/v1/chatbot             use AI assistant
✅ GET    /api/v1/notifications       view notifications
✅ PATCH  /api/v1/notifications/…     mark read
```

### seller (logged in, role = 'seller')
```
✅ everything clients can do
✅ POST   /api/v1/products            create products
✅ PUT    /api/v1/products/:id        edit own products
✅ DELETE /api/v1/products/:id        delete own products
✅ GET    /api/v1/orders              view incoming orders (role-scoped)
✅ PATCH  /api/v1/orders/:id/status   accept / reject orders
✅ PATCH  /api/v1/orders/:id/ready    mark order READY + set final_price + delivery
✅ POST   /api/v1/client-ratings      rate clients after order completion
✅ GET    /api/v1/analytics           view shop analytics
✅ POST   /api/v1/sellers             create shop profile
✅ PUT    /api/v1/sellers/:id         update shop profile
```

### admin (logged in, role = 'admin')
```
✅ full access to everything
✅ GET    /api/v1/admin/users         manage users
✅ PATCH  /api/v1/admin/sellers/:id   verify sellers
✅ DELETE /api/v1/admin/products/:id  remove products
✅ GET    /api/v1/admin/stats         platform statistics
✅ POST   /api/v1/categories          create categories
✅ PUT    /api/v1/categories/:id      update categories
✅ DELETE /api/v1/categories/:id      delete categories
```

---

## API ROUTES — COMPLETE LIST

### Auth  `/api/v1/auth`
```
POST   /register               Register new account
POST   /login                  Login (returns token + OTP prompt if 2FA enabled)
POST   /refresh                Refresh access token
POST   /verify-otp             Verify OTP code (2FA)
GET    /me                     Get current user (auth required)
PUT    /me                     Update profile (auth required)
POST   /logout                 Logout (auth required)
POST   /change-password        Change password (auth required)
```

### Categories  `/api/v1/categories`
```
GET    /                       All categories (public)
GET    /slug/:slug             Get by slug (public)
GET    /:id                    Get by ID (public)
POST   /                       Create (admin only)
PUT    /:id                    Update (admin only)
DELETE /:id                    Delete (admin only)
```

### Products  `/api/v1/products`
```
GET    /                       Browse (public, filters + pagination)
GET    /my-products            Own products (seller)
POST   /                       Create (seller)
PUT    /:id                    Update (seller)
DELETE /:id                    Delete (seller)
GET    /:id                    Detail (public, optional auth for tracking)
```

### Orders  `/api/v1/orders`
```
POST   /                       Create custom order (auth)
GET    /                       List orders (auth, role-scoped)
GET    /:id                    Get order (auth, ownership checked)
PATCH  /:id/status             Accept / reject (seller)
PATCH  /:id/ready              Mark READY + set final_price + delivery (seller)
PATCH  /:id/complete           Confirm completion (client)
```

### Sellers  `/api/v1/sellers`
```
GET    /                       Browse verified sellers (public)
GET    /me                     Own full profile (seller)
GET    /analytics              Shop analytics (seller)
POST   /                       Create shop (seller)
PUT    /:id                    Update shop (seller)
PATCH  /:id/verify             Verify seller (admin)
GET    /:id                    Get seller profile (public)
```

### Reviews & Ratings  `/api/v1/reviews`
```
GET    /product/:product_id    Get product reviews (public)
POST   /product                Create product review (client)
DELETE /:id                    Delete own review (client)
GET    /seller/:seller_id      Get seller ratings (public)
POST   /seller                 Rate seller (client, after completed order)
```

### Client Ratings  `/api/v1/client-ratings`
```
POST   /                       Rate a client (seller, after completed order)
GET    /client/:client_id      Get ratings for a client (public)
```

### Wishlist  `/api/v1/wishlist`
```
GET    /                       List wishlist (auth, paginated)
POST   /                       Add item (auth)
GET    /:product_id/check      Check if in wishlist (auth)
DELETE /:product_id            Remove item (auth)
```

### Notifications  `/api/v1/notifications`
```
GET    /                       List (auth, paginated)
GET    /unread-count           Count unread (auth)
PATCH  /mark-all-read          Mark all as read (auth)
PATCH  /:id/read               Mark one as read (auth)
DELETE /:id                    Delete (auth)
```

### Uploads  `/api/v1/uploads`
```
POST   /image                  Upload single image (auth)
POST   /images                 Upload up to 5 images (auth)
```

### Chatbot  `/api/v1/chatbot`
```
POST   /                       Send message to AI assistant (auth)
```

### Admin  `/api/v1/admin`
```
GET    /users                  List users (admin)
GET    /stats                  Platform statistics (admin)
```

---

## API DESIGN RULES

### URL Structure
```
/api/v1/{resource}
/api/v1/{resource}/:id
/api/v1/{resource}/:id/{action}   ← for state transitions
```

### Standard Response Format
```javascript
// SUCCESS
{ "success": true, "message": "...", "data": { ... } }

// ERROR
{ "success": false, "message": "...", "errors": null }
```

### Pagination Format
```javascript
// Request: GET /api/v1/products?page=1&limit=20
// Response:
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8, "hasNext": true, "hasPrev": false }
  }
}
```

### HTTP Status Codes
```
200 → OK
201 → Created
400 → Bad Request (validation error)
401 → Unauthorized
403 → Forbidden
404 → Not Found
409 → Conflict (duplicate)
429 → Too Many Requests
500 → Internal Server Error
```

---

## SECURITY

### Two-Factor Authentication (2FA)
```
- Enabled via AUTH_OTP_ENABLED=true in .env
- Flow: login → receive OTP via email (Resend) → POST /auth/verify-otp
- OTP sessions stored in-memory with 10-minute TTL
- Max 5 verification attempts per session
- Session invalidated after successful verification or expiry
```

### Middleware Stack (in order)
```
1. helmet()          → 15 secure HTTP headers
2. cors()            → whitelist CLIENT_URL + localhost
3. hpp()             → HTTP parameter pollution protection
4. compression()     → gzip responses
5. express.json()    → parse request body (100KB limit)
6. morgan()          → HTTP request logging
7. rateLimit()       → limit requests per IP
8. authenticate      → verify JWT (protected routes)
9. requireRole()     → check role (role-protected routes)
10. validate()       → Zod schema validation
11. controller       → handle the request
12. errorHandler     → global catch-all (must be LAST)
```

### Rate Limits
```
Global:   100 requests / 15 minutes / IP
Auth:      10 requests / 15 minutes / IP
Chatbot:   20 requests / 1 hour / user
Uploads:   10 requests / 1 hour / user
```

### Input Validation Rules
```
All POST/PUT/PATCH → validated with Zod schemas
Query parameters   → sanitized and typed
File uploads       → type, extension, magic bytes, size checked (5MB max)
IDs                → must be valid UUID
Strings            → trimmed + max length enforced
User IDs           → NEVER trust client-provided (always use JWT)
```

---

## ENVIRONMENT VARIABLES

### Backend (.env)
```
PORT=4000
NODE_ENV=development

SUPABASE_URL=https://azjeomrahtmaeergfffh.supabase.co
SUPABASE_ANON_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_secret_key

CLIENT_URL=http://localhost:5173
JWT_SECRET=hirftna_marketplace_super_secret_key_2026

AUTH_OTP_ENABLED=true
OTP_EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=your_resend_key

# Added later:
GEMINI_API_KEY=
CHARGILY_API_KEY=
CHARGILY_SECRET=
```

### Frontend (.env)
```
VITE_SUPABASE_URL=https://azjeomrahtmaeergfffh.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
VITE_API_URL=http://localhost:4000/api/v1
```

---

## NAMING CONVENTIONS

```javascript
// Files
auth.controller.js       ← feature.type.js

// Functions
createOrder()            ← camelCase verbs
markOrderReady()
confirmOrderComplete()
rateClient()

// Variables
const userId             ← camelCase
const sellerId
const finalPrice

// Constants
const MAX_FILE_SIZE      ← UPPER_SNAKE_CASE
const VALID_TRANSITIONS

// DB queries
const { data, error }    ← always destructure Supabase response

// req.validated          ← single source of truth in controllers
const { body, params, query } = req.validated;
```

---

## FRONTEND–BACKEND ALIGNMENT RULE

```
✅ Every frontend feature MUST have a matching backend API endpoint
✅ No fake UI state without real API support
✅ All order interactions use real order status from backend
✅ Notifications are real-time or polled from backend (not client-side faked)
✅ Chatbot responses come from backend (Gemini via backend proxy)
✅ Payment (Chargily) is frontend-only — no backend webhook needed for MVP
```

---

## HOW FRONTEND TALKS TO BACKEND

```
React (port 5173)
    ↓ HTTP with JWT: Authorization: Bearer eyJ...
Express (port 4000)
    ↓ auth.middleware verifies token with Supabase
    ↓ requireRole checks role from DB
    ↓ validate() runs Zod schema on req
    ↓ controller calls service
    ↓ service queries Supabase via supabaseAdmin
Supabase (cloud)
    ↓ returns data
React receives standardized response { success, message, data }
```

---

## FEATURE BUILD ORDER

```
Phase 1 — Foundation ✅ COMPLETE
├── STEP 1  ✅ Project setup & folder structure
├── STEP 2  ✅ .gitignore
├── STEP 3  ✅ .env + .env.example
├── STEP 4  ✅ package.json
├── STEP 5  ✅ src/utils/logger.js
├── STEP 6  ✅ src/utils/response.js
├── STEP 7  ✅ src/config/env.js
├── STEP 8  ✅ src/config/supabase.js
├── STEP 9  ✅ src/middlewares/error.middleware.js
├── STEP 10 ✅ src/middlewares/validate.middleware.js
├── STEP 11 ✅ src/middlewares/auth.middleware.js
├── STEP 12 ✅ src/middlewares/role.middleware.js
├── STEP 13 ✅ src/app.js
└── STEP 14 ✅ src/server.js

Phase 2 — Authentication ✅ COMPLETE + 2FA WORKING
├── STEP 15 ✅ src/validators/auth.validator.js
├── STEP 16 ✅ src/services/auth.service.js   (OTP 2FA with Resend)
├── STEP 17 ✅ src/controllers/auth.controller.js
└── STEP 18 ✅ src/routes/auth.routes.js

Phase 3 — Categories ✅ COMPLETE
├── STEP 19 ✅ src/services/category.service.js
├── STEP 20 ✅ src/controllers/category.controller.js
└── STEP 21 ✅ src/routes/category.routes.js

Phase 4 — Products ✅ COMPLETE
├── STEP 22 ✅ src/validators/product.validator.js
├── STEP 23 ✅ src/services/product.service.js
├── STEP 24 ✅ src/controllers/product.controller.js
└── STEP 25 ✅ src/routes/product.routes.js

Phase 5 — File Uploads ✅ COMPLETE
├── STEP 26 ✅ src/services/upload.service.js
├── STEP 27 ✅ src/controllers/upload.controller.js
└── STEP 28 ✅ src/routes/upload.routes.js

Phase 6 — Sellers ✅ COMPLETE
├── STEP 29 ✅ src/validators/seller.validator.js
├── STEP 30 ✅ src/services/seller.service.js
├── STEP 31 ✅ src/controllers/seller.controller.js
└── STEP 32 ✅ src/routes/seller.routes.js

Phase 7 — Orders ✅ COMPLETE (needs READY + COMPLETE endpoints)
├── STEP 33 ✅ src/validators/order.validator.js
├── STEP 34 ✅ src/services/order.service.js    ← ADD: markReady(), confirmComplete()
├── STEP 35 ✅ src/controllers/order.controller.js ← ADD: markReady(), confirmComplete()
└── STEP 36 ✅ src/routes/order.routes.js       ← ADD: PATCH /:id/ready, /:id/complete

Phase 8 — Reviews & Ratings ✅ COMPLETE
├── STEP 37 ✅ src/validators/review.validator.js
├── STEP 38 ✅ src/services/review.service.js
├── STEP 39 ✅ src/controllers/review.controller.js
└── STEP 40 ✅ src/routes/review.routes.js

Phase 9 — Wishlist ✅ COMPLETE
├── STEP 41 ✅ src/services/wishlist.service.js
├── STEP 42 ✅ src/controllers/wishlist.controller.js
└── STEP 43 ✅ src/routes/wishlist.routes.js

Phase 10 — Notifications ✅ COMPLETE (types updated)
├── STEP 44 ✅ src/services/notification.service.js
├── STEP 45 ✅ src/controllers/notification.controller.js
└── STEP 46 ✅ src/routes/notification.routes.js

Phase 11 — Client Ratings (NEW — seller rates client)
├── STEP 47 ⬜ src/validators/clientRating.validator.js
├── STEP 48 ⬜ src/services/clientRating.service.js
├── STEP 49 ⬜ src/controllers/clientRating.controller.js
└── STEP 50 ⬜ src/routes/clientRating.routes.js

Phase 12 — AI Chatbot (Gemini)
├── STEP 51 ⬜ src/validators/chatbot.validator.js
├── STEP 52 ⬜ src/services/chatbot.service.js   (Gemini API)
├── STEP 53 ⬜ src/controllers/chatbot.controller.js
└── STEP 54 ⬜ src/routes/chatbot.routes.js

Phase 13 — Admin
├── STEP 55 ⬜ src/services/admin.service.js
├── STEP 56 ⬜ src/controllers/admin.controller.js
└── STEP 57 ⬜ src/routes/admin.routes.js

Phase 14 — Payments (Chargily — frontend only for MVP)
└── STEP 58 ⬜ Frontend integration only (no backend needed for MVP)

                    ↓
            🧪 FULL API TEST IN POSTMAN
                    ↓
            🚀 BACKEND COMPLETE
```

---

## COMMON MISTAKES TO AVOID

```
❌ Never use req.body directly — always use req.validated.body
❌ Never return full error details in production
❌ Never skip the ownership check before update/delete
❌ Never hardcode any key or URL in code
❌ Never commit .env to GitHub
❌ Never use supabaseAdmin in frontend
❌ Never trust client-provided user IDs — use JWT
❌ Never skip pagination on list endpoints
❌ Never add stock checks — this is a custom-order platform
❌ Never allow rating a client unless order status = 'completed'
❌ Never allow a seller to call /complete — only clients can confirm completion
❌ Never use Stripe — use Chargily for Algerian payments
❌ Never add a chat/messaging feature — use the Custom Order system
❌ Never use OpenAI — use Gemini or a free AI API
```

---

## POSTMAN TESTING CHECKLIST

After each phase:
```
✅ Happy path works (correct input → correct response)
✅ Missing fields return 400 with clear message
✅ Invalid token returns 401
✅ Wrong role returns 403
✅ Non-existent resource returns 404
✅ Duplicate entry returns 409
✅ Rate limit returns 429 after threshold
✅ Order status transitions are enforced (no skipping steps)
✅ Seller cannot call /complete, client cannot call /ready
✅ Client ratings only allowed after order is COMPLETED
```

---

*Last updated: 2026-05-02*
*Phases 1–10 complete. Next: Phase 11 (Client Ratings) + Order READY/COMPLETE endpoints*
