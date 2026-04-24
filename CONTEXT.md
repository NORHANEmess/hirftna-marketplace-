# HIRFTNA MARKETPLACE — Master Project Context
# This file is the single source of truth for the entire project.
# Reference this file in every Cursor AI interaction using @CONTEXT.md
# Update the progress tracker after every completed file.

---

## PROJECT IDENTITY

- **Name:** Hirftna Marketplace
- **Type:** Intelligent e-commerce marketplace for artisans
- **Purpose:** Connects sellers (artisans/small businesses) with clients (buyers)
- **Stage:** MVP Development
- **Timeline:** 2 months

---

## TECHNOLOGY STACK

### Backend
- **Runtime:** Node.js v20+
- **Framework:** Express.js v5
- **Language:** JavaScript (no TypeScript)
- **Validation:** Zod
- **Logging:** Winston
- **Auth:** Supabase Auth + JWT verification

### Database & Services
- **Database:** Supabase (PostgreSQL 15)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Realtime:** Supabase Realtime (notifications)

### Frontend (built after backend)
- **Framework:** React 18 (Vite)
- **Styling:** TailwindCSS
- **Routing:** React Router v6
- **Language:** JavaScript

### External Services (added later)
- **Payments:** Stripe
- **AI Chatbot:** OpenAI GPT-4o
- **Email:** Resend

---

## PROJECT STRUCTURE

```
C:\Hirftna-marketplace\
├── CONTEXT.md                  ← you are here
├── backend/                    ← Node.js/Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js          ← validates environment variables
│   │   │   └── supabase.js     ← Supabase client connections
│   │   ├── controllers/        ← handle req/res, call services
│   │   ├── routes/             ← define API endpoints
│   │   ├── services/           ← business logic, DB queries
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js      ← verify JWT token
│   │   │   ├── role.middleware.js      ← check user role
│   │   │   ├── validate.middleware.js  ← Zod validation
│   │   │   └── error.middleware.js     ← global error handler
│   │   ├── utils/
│   │   │   ├── logger.js       ← Winston logger
│   │   │   └── response.js     ← standardized API responses
│   │   ├── validators/         ← Zod schemas per feature
│   │   ├── app.js              ← Express app + middleware setup
│   │   └── server.js           ← entry point, starts server
│   ├── logs/                   ← auto-generated log files
│   ├── .env                    ← secret keys (never commit)
│   ├── .env.example            ← template (safe to commit)
│   ├── .gitignore
│   └── package.json
└── frontend/                   ← React app (built later)
```

---

## SUPABASE CONFIGURATION

```
Project URL:      https://azjeomrahtmaeergfffh.supabase.co
Project ID:       azjeomrahtmaeergfffh
Region:           EU West
```

### Storage Buckets
| Bucket Name | Access | Purpose |
|-------------|--------|---------|
| product-images | Public | Product photos |
| avatars | Public | User/seller profile pictures |

### Two Supabase Clients (backend only)
```javascript
// 1. Public client → verify user JWT tokens (uses ANON key)
supabasePublic

// 2. Admin client → all database operations (uses SERVICE ROLE key)
// NEVER expose service role key to frontend
supabaseAdmin
```

---

## DATABASE SCHEMA — ALL 15 TABLES

### 1. users
```
id            UUID  PK  (mirrors auth.users.id)
email         TEXT  NOT NULL UNIQUE
full_name     TEXT
phone         TEXT
avatar_url    TEXT
role          TEXT  CHECK (role IN ('client','seller','admin')) DEFAULT 'client'
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()
```

### 2. sellers
```
id            UUID  PK
user_id       UUID  FK → users.id UNIQUE
shop_name     TEXT  NOT NULL
description   TEXT
story         TEXT  (Markdown — "Story of the Seller")
location      TEXT
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
Pre-filled with: Jewelry, Pottery, Textiles, Paintings,
Leather Goods, Candles & Soap, Food & Honey, Home Decor, Other

### 4. products
```
id            UUID  PK
seller_id     UUID  FK → sellers.id
category_id   UUID  FK → categories.id
name          TEXT  NOT NULL
description   TEXT
price         NUMERIC(10,2) NOT NULL
stock         INTEGER DEFAULT 0
avg_rating    NUMERIC(3,2) DEFAULT 0
view_count    INTEGER DEFAULT 0
is_active     BOOL  DEFAULT true
fts           TSVECTOR (auto-generated for full-text search)
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
```

### 5. product_images
```
id            UUID  PK
product_id    UUID  FK → products.id
url           TEXT  NOT NULL (Supabase Storage URL)
position      INTEGER DEFAULT 0 (0 = cover image)
created_at    TIMESTAMPTZ
```

### 6. orders
```
id              UUID  PK
client_id       UUID  FK → users.id
seller_id       UUID  FK → sellers.id
status          TEXT  CHECK ('pending','accepted','rejected','completed')
total_amount    NUMERIC(10,2)
delivery_type   TEXT  CHECK ('fast','office_pickup','hand_to_hand')
payment_method  TEXT  CHECK ('card','cash_on_delivery')
client_name     TEXT
client_phone    TEXT
client_address  TEXT
notes           TEXT
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### 7. order_items
```
id            UUID  PK
order_id      UUID  FK → orders.id
product_id    UUID  FK → products.id
quantity      INTEGER NOT NULL
unit_price    NUMERIC(10,2) (snapshot at time of order)
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

### 9. ratings
```
id            UUID  PK
seller_id     UUID  FK → sellers.id
client_id     UUID  FK → users.id
rating        INTEGER CHECK (1-5)
created_at    TIMESTAMPTZ
UNIQUE (seller_id, client_id)
```

### 10. wishlist
```
id            UUID  PK
user_id       UUID  FK → users.id
product_id    UUID  FK → products.id
created_at    TIMESTAMPTZ
UNIQUE (user_id, product_id)
```

### 11. notifications
```
id            UUID  PK
user_id       UUID  FK → users.id
type          TEXT  CHECK ('new_order','order_accepted','order_rejected','message','system')
title         TEXT  NOT NULL
body          TEXT
is_read       BOOL  DEFAULT false
meta          JSONB DEFAULT '{}'
created_at    TIMESTAMPTZ
```

### 12. messages
```
id            UUID  PK
user_id       UUID  FK → users.id
seller_id     UUID  FK → sellers.id
product_id    UUID  FK → products.id
role          TEXT  CHECK ('user','assistant')
content       TEXT  NOT NULL
created_at    TIMESTAMPTZ
```

### 13. subscriptions
```
id              UUID  PK
seller_id       UUID  FK → sellers.id UNIQUE
plan            TEXT  CHECK ('free','chatbot')
stripe_sub_id   TEXT
stripe_cust_id  TEXT
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
product_id    UUID  FK → products.id (nullable = promote seller)
placement     TEXT  CHECK ('homepage','featured','category_top')
starts_at     TIMESTAMPTZ
ends_at       TIMESTAMPTZ
is_active     BOOL  DEFAULT true
stripe_pi     TEXT
created_at    TIMESTAMPTZ
```

### 15. browsing_events
```
id            UUID  PK
user_id       UUID  FK → users.id (nullable for visitors)
product_id    UUID  FK → products.id
event_type    TEXT  CHECK ('view','cart','wishlist','purchase')
occurred_at   TIMESTAMPTZ DEFAULT now()
```

---

## DATABASE TRIGGERS (auto-configured in Supabase)

```
1. on_auth_user_created
   → fires after INSERT on auth.users
   → automatically creates a row in public.users

2. trg_product_avg_rating
   → fires after INSERT/UPDATE/DELETE on reviews
   → automatically recalculates products.avg_rating

3. trg_seller_avg_rating
   → fires after INSERT/UPDATE/DELETE on ratings
   → automatically recalculates sellers.avg_rating

4. trg_seller_subscription
   → fires after INSERT on sellers
   → automatically creates a free subscription row
```

---

## USER ROLES & PERMISSIONS

### visitor (not logged in)
```
✅ GET  /api/v1/products        browse products
✅ GET  /api/v1/products/:id    view product detail
✅ GET  /api/v1/sellers/:id     view seller profile
✅ GET  /api/v1/categories      view categories
❌ cannot place orders
❌ cannot write reviews
❌ cannot rate sellers
```

### client (logged in, role = 'client')
```
✅ everything visitors can do
✅ POST /api/v1/orders          place orders
✅ GET  /api/v1/orders          view own orders
✅ POST /api/v1/reviews         write reviews
✅ POST /api/v1/ratings         rate sellers
✅ POST /api/v1/wishlist        manage wishlist
✅ POST /api/v1/chatbot         use AI chatbot
✅ GET  /api/v1/notifications   view notifications
```

### seller (logged in, role = 'seller')
```
✅ everything clients can do
✅ POST   /api/v1/products      create products
✅ PUT    /api/v1/products/:id  edit own products
✅ DELETE /api/v1/products/:id  delete own products
✅ GET    /api/v1/orders        view own shop orders
✅ PATCH  /api/v1/orders/:id    accept/reject orders
✅ GET    /api/v1/analytics     view shop analytics
✅ PUT    /api/v1/sellers/:id   edit own shop profile
```

### admin (logged in, role = 'admin')
```
✅ full access to everything
✅ GET    /api/v1/admin/users         manage users
✅ PATCH  /api/v1/admin/sellers/:id   verify sellers
✅ DELETE /api/v1/admin/products/:id  remove products
✅ GET    /api/v1/admin/stats         platform statistics
```

---

## API DESIGN RULES

### URL Structure
```
/api/v1/{resource}          ← always use v1 prefix
/api/v1/{resource}/:id      ← specific resource
/api/v1/{resource}/:id/{sub-resource}
```

### HTTP Methods
```
GET    → read data (no body)
POST   → create new resource
PUT    → replace entire resource
PATCH  → update specific fields
DELETE → remove resource
```

### Standard Response Format
Every single API response MUST use this format:

```javascript
// SUCCESS
{
  "success": true,
  "message": "Products fetched successfully",
  "data": { ... }          // or array or null
}

// ERROR
{
  "success": false,
  "message": "Product not found",
  "errors": null           // or validation errors array
}
```

### Pagination Format
All list endpoints must support pagination:
```javascript
// Request
GET /api/v1/products?page=1&limit=20

// Response
{
  "success": true,
  "message": "Products fetched",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error HTTP Status Codes
```
200 → OK (success)
201 → Created (new resource)
400 → Bad Request (validation error)
401 → Unauthorized (not logged in)
403 → Forbidden (logged in but no permission)
404 → Not Found
409 → Conflict (duplicate entry)
429 → Too Many Requests (rate limited)
500 → Internal Server Error
```

---

## SECURITY REQUIREMENTS

### Every File Must:
```
✅ Never expose sensitive data in responses
✅ Never trust user input without validation
✅ Always use try/catch or asyncHandler
✅ Always check user ownership before update/delete
✅ Never log sensitive data (passwords, keys, tokens)
```

### Middleware Stack (in order)
```
1. helmet()          → secure HTTP headers
2. cors()            → only allow CLIENT_URL
3. hpp()             → HTTP parameter pollution
4. compression()     → gzip responses
5. express.json()    → parse request body
6. morgan()          → HTTP request logging
7. rateLimit()       → limit requests per IP
8. authenticate      → verify JWT (protected routes)
9. requireRole()     → check role (role-protected routes)
10. validate()       → Zod schema validation
11. controller       → handle the request
12. errorHandler     → catch all errors (last)
```

### Rate Limits
```
Global:     100 requests / 15 minutes / IP
Auth:       10  requests / 15 minutes / IP
Chatbot:    20  requests / 1 hour / user
Uploads:    10  requests / 1 hour / user
```

### Input Validation Rules
```
All POST/PUT/PATCH requests → validated with Zod
Query parameters            → sanitized and typed
File uploads                → type and size checked
IDs                         → must be valid UUID format
Strings                     → trimmed and max length set
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

# Added later:
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
```

### Frontend (.env) — built later
```
VITE_SUPABASE_URL=https://azjeomrahtmaeergfffh.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
VITE_API_URL=http://localhost:4000
```

---

## NAMING CONVENTIONS

```javascript
// Files
auth.controller.js      ← feature.type.js
auth.service.js
auth.routes.js
auth.validator.js

// Functions
getProducts()           ← camelCase verbs
createOrder()
updateSellerProfile()
deleteProduct()

// Variables
const userId            ← camelCase
const sellerId
const productImages

// Constants
const MAX_FILE_SIZE     ← UPPER_SNAKE_CASE
const ALLOWED_TYPES

// Database queries
const { data, error }   ← always destructure Supabase response
```

---

## HOW FRONTEND TALKS TO BACKEND

```
React (port 5173)
    ↓ HTTP request with JWT token in header
    ↓ Authorization: Bearer eyJ...
Express (port 4000)
    ↓ auth.middleware verifies token
    ↓ controller calls service
    ↓ service queries Supabase
Supabase (cloud)
    ↓ returns data
    ↓ back through the chain
React receives response
```

---

## FEATURE BUILD ORDER

```
Phase 1 — Foundation COMPLETE ✅
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
                    ↓
            🚀 SERVER STARTS HERE

Phase 2 — Authentication
├── STEP 15 ✅ src/validators/auth.validator.js
├── STEP 16 ✅ src/services/auth.service.js
├── STEP 17 ✅ src/controllers/auth.controller.js
├── STEP 18 ✅ src/routes/auth.routes.js
                    ↓
            🧪 TEST IN POSTMAN ✅ DONE

Phase 3 — Categories ✅ COMPLETE
├── STEP 19 ✅ src/services/category.service.js
├── STEP 20 ✅ src/controllers/category.controller.js
└── STEP 21 ✅ src/routes/category.routes.js
                    ↓
            🧪 TEST CATEGORIES IN POSTMAN

Phase 4 — Products ✅ COMPLETE
├── STEP 22 ✅ src/validators/product.validator.js
├── STEP 23 ✅ src/services/product.service.js
├── STEP 24 ✅ src/controllers/product.controller.js
└── STEP 25 ✅ src/routes/product.routes.js
                    ↓
            🧪 TEST PRODUCTS IN POSTMAN

Phase 5 — File Uploads ✅ COMPLETE + TESTED
├── STEP 26 ✅ src/services/upload.service.js
├── STEP 27 ✅ src/controllers/upload.controller.js
└── STEP 28 ✅ src/routes/upload.routes.js

Phase 6 — Sellers ✅ COMPLETE + TESTED
├── STEP 29 ✅ src/validators/seller.validator.js
├── STEP 30 ✅ src/services/seller.service.js
├── STEP 31 ✅ src/controllers/seller.controller.js
└── STEP 32 ✅ src/routes/seller.routes.js
                    ↓
            🧪 TEST SELLERS IN POSTMAN

Phase 7 — Orders ✅ COMPLETE + TESTED
├── STEP 33 ✅ src/validators/order.validator.js
├── STEP 34 ✅ src/services/order.service.js
├── STEP 35 ✅ src/controllers/order.controller.js
└── STEP 36 ✅ src/routes/order.routes.js
                    ↓
            🧪 TEST ORDERS IN POSTMAN

Phase 8 — Reviews & Ratings
├── STEP 37 ✅ src/validators/review.validator.js
├── STEP 38 ✅ src/services/review.service.js
├── STEP 39 ✅ src/controllers/review.controller.js
└── STEP 40 ✅ src/routes/review.routes.js

Phase 9 — Wishlist
├── STEP 41 ✅ src/services/wishlist.service.js
├── STEP 42 ✅ src/controllers/wishlist.controller.js
└── STEP 43 ✅ src/routes/wishlist.routes.js

Phase 10 — Notifications
├── STEP 44 ✅ src/services/notification.service.js
├── STEP 45 ✅ src/controllers/notification.controller.js
└── STEP 46 ✅ src/routes/notification.routes.js

Phase 11 — AI Chatbot
├── STEP 47 ⬜ src/validators/chatbot.validator.js
├── STEP 48 ⬜ src/services/chatbot.service.js
├── STEP 49 ⬜ src/controllers/chatbot.controller.js
└── STEP 50 ⬜ src/routes/chatbot.routes.js

Phase 12 — Payments (chargily) just in frontend i don't have to do it in backend
├── STEP 51 ⬜ src/services/payment.service.js
├── STEP 52 ⬜ src/controllers/payment.controller.js
└── STEP 53 ⬜ src/routes/payment.routes.js

Phase 13 — Recommendations it dosn't metter 
├── STEP 54 ⬜ src/services/recommendation.service.js
├── STEP 55 ⬜ src/controllers/recommendation.controller.js
└── STEP 56 ⬜ src/routes/recommendation.routes.js

Phase 14 — Admin
├── STEP 57 ⬜ src/services/admin.service.js
├── STEP 58 ⬜ src/controllers/admin.controller.js
└── STEP 59 ⬜ src/routes/admin.routes.js
                    ↓
            🧪 FULL API TEST IN POSTMAN
                    ↓
            🚀 BACKEND COMPLETE
```

---

## HOW TO USE THIS FILE WITH CURSOR

### When writing a new file, always start your Cursor prompt with:
```
@CONTEXT.md

Now write [filename].
Already completed files: @logger.js @response.js (etc.)

Requirements:
[list specific requirements]
```

### After completing each file:
1. Change ⬜ to ✅ in the progress tracker above
2. Save CONTEXT.md
3. Move to the next step

### When you get an error:
```
@CONTEXT.md @[file-with-error].js

I got this error:
[paste full error message]

Fix it without breaking the existing structure.
```

---

## COMMON MISTAKES TO AVOID

```
❌ Never use req.body without validation
❌ Never return full error details in production
❌ Never use * in Supabase select for sensitive tables
❌ Never skip the ownership check before update/delete
❌ Never hardcode any key or URL in code
❌ Never commit .env to GitHub
❌ Never use supabaseAdmin in frontend
❌ Never trust client-provided user IDs (use JWT)
❌ Never skip pagination on list endpoints
❌ Never use synchronous file operations
```

---

## POSTMAN TESTING CHECKLIST

After each phase, test:
```
✅ Happy path works (correct input → correct response)
✅ Missing fields return 400 with clear message
✅ Invalid token returns 401
✅ Wrong role returns 403
✅ Non-existent resource returns 404
✅ Duplicate entry returns 409
✅ Rate limit returns 429 after threshold
```

---

*Last updated: Phases 8-10 complete*
*Next: Frontend Development*