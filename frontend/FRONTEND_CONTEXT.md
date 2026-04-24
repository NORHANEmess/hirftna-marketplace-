# HIRFTNA MARKETPLACE — Frontend Context
# Single source of truth for the React frontend
# Reference this file in every Cursor/Copilot interaction
# Update progress tracker after every completed file

---

## PROJECT IDENTITY

- **Name:** Hirftna Marketplace (حرفتنا)
- **Type:** Custom-made artisan marketplace — NOT traditional e-commerce
- **Key Concept:** Products are custom, prices are ranges, orders are requests
- **Frontend Stack:** React 18 + Vite + TailwindCSS + React Router v7
- **Backend:** Already built — Node.js/Express running on port 4000
- **Design:** Warm cream/beige palette, sage green accent, rounded corners, soft shadows, mobile-first

---

## DESIGN SYSTEM (ALREADY CONFIGURED)

### Colors
```
cream-100:  #FDF9F3  ← page background
cream-200:  #FAF4EA
cream-300:  #F5ECD8
beige-200:  #EDE0CC  ← borders
beige-300:  #E2CFB2
sage-400:   #8FA684
sage-500:   #728C67  ← primary accent
sage-600:   #5C7253
warm-400:   #B8B4A8  ← muted text
warm-800:   #35322A  ← body text
warning:    #D4872A  ← stars
```

### Component Classes (src/index.css)
```
.btn-primary    → sage green filled button
.btn-secondary  → cream button
.btn-outline    → outlined sage button
.card           → white rounded card with soft shadow
.card-hover     → card with hover effect
.input          → cream input field
.label          → form label
.badge-sage     → sage green badge
.skeleton       → loading placeholder
.bottom-nav     → mobile bottom bar
.safe-bottom    → iOS notch padding
```

---

## CORE CONCEPT — CUSTOM ORDER PLATFORM

### This is NOT traditional e-commerce:
```
❌ No fixed price       → Products show PRICE RANGE (min - max DA)
❌ No "Add to Cart"     → Primary CTA is "Request Custom Order"
❌ No direct chat       → Only chatbot for questions
❌ No instant checkout  → Order = request → seller reviews → offer → accept
```

### Product Model (what backend returns):
```javascript
{
  id, name, description, price, stock,    // price = base/reference price
  avg_rating, view_count, is_active,
  category: { id, name, slug },
  seller: { id, shop_name, avg_rating, is_verified },
  images: [{ id, url, position }]
}
// NOTE: price_min/price_max not in DB yet (see Supabase updates below)
// For now display price as "From X DA" until DB updated
```

---

## BACKEND ANALYSIS — WHAT CHANGED vs WHAT'S CORRECT

### ✅ CORRECT — Do NOT Change
```
- All 39 API endpoints work correctly
- orders table has client_id + seller_id ✅
- Order status machine (pending→accepted/rejected→completed) ✅
- Auth, products, sellers, reviews, wishlist, notifications ✅
- Supabase schema, RLS policies, triggers ✅
```

### ⚠️ BACKEND CHANGES NEEDED (2 small changes only)

#### Change 1 — Remove requireRole('client') from POST /orders
File: backend/src/routes/order.routes.js
```javascript
// BEFORE (blocks sellers from buying)
router.post('/', authenticate, requireRole('client'), validate(...), controller)

// AFTER (any authenticated user can place an order)
router.post('/', authenticate, validate(...), controller)
```

#### Change 2 — Add ?as=client query support in order.service.js
File: backend/src/services/order.service.js
```javascript
// In getAllOrders(), replace the role scoping with:
if (role === 'seller' && query.as === 'client') {
  dbQuery = dbQuery.eq('client_id', userId);        // seller's purchases
} else if (role === 'client') {
  dbQuery = dbQuery.eq('client_id', userId);        // client's orders
} else if (role === 'seller') {
  const { data: seller } = await supabaseAdmin
    .from('sellers').select('id').eq('user_id', userId).single();
  if (seller) dbQuery = dbQuery.eq('seller_id', seller.id);  // incoming
}
```

#### Change 3 — Add `as` param to order.validator.js (provided below)

### ⚠️ SUPABASE CHANGES NEEDED (optional for Phase 2)

#### Add price_min + price_max to products table:
```sql
-- Run in Supabase SQL Editor
ALTER TABLE products
  ADD COLUMN price_min NUMERIC(10,2),
  ADD COLUMN price_max NUMERIC(10,2);

-- Make existing price the reference/base price
-- price_min = lower bound of custom order range
-- price_max = upper bound
```

#### Add custom order fields to orders table:
```sql
ALTER TABLE orders
  ADD COLUMN custom_description TEXT,
  ADD COLUMN budget_min         NUMERIC(10,2),
  ADD COLUMN budget_max         NUMERIC(10,2),
  ADD COLUMN deadline           DATE,
  ADD COLUMN reference_images   TEXT[],  -- array of Supabase Storage URLs
  ADD COLUMN is_custom          BOOLEAN DEFAULT true;
-- buyer_id is already client_id — no rename needed
```

---

## USER ROLES & NAVIGATION

### Role Detection
```javascript
// In AuthContext:
const isVisitor = !user
const isClient  = user?.role === 'client'
const isSeller  = user?.role === 'seller'
const isAdmin   = user?.role === 'admin'
// IMPORTANT: seller is ALSO a client — they can place orders too
```

### Navigation — Mobile (Bottom Bar)

#### Visitor (not logged in) — 4 tabs
```
Home | Browse | Categories | Login
```

#### Client (logged in) — 5 tabs
```
Home | Search | Wishlist | Orders | Profile
```

#### Seller (logged in) — 5 tabs
```
Home | Search | Orders | Notifications | Profile
```
Note: "Add Product" is inside Profile/Dashboard, NOT in nav

### Navigation — Desktop (Top Bar only)
```
Logo | Categories dropdown | Search bar | Wishlist | Orders | Notifications | Profile
```
No bottom bar on desktop (md: breakpoint and above)

---

## FRONTEND FOLDER STRUCTURE

```
frontend/src/
├── assets/
├── components/
│   ├── ui/                 ← reusable atomic components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Badge.jsx
│   │   ├── Modal.jsx
│   │   ├── Spinner.jsx
│   │   ├── StarRating.jsx
│   │   └── ImageUpload.jsx
│   ├── layout/
│   │   ├── MainLayout.jsx      ← wraps all pages
│   │   ├── TopBar.jsx          ← logo + search + categories
│   │   ├── BottomNav.jsx       ← mobile only, role-aware
│   │   └── DesktopNav.jsx      ← desktop top nav
│   ├── product/
│   │   ├── ProductCard.jsx     ← shows price range + Request button
│   │   ├── ProductGrid.jsx
│   │   └── ProductSkeleton.jsx
│   ├── order/
│   │   ├── CustomOrderForm.jsx ← THE core form
│   │   ├── OrderCard.jsx
│   │   └── OrderStatusBadge.jsx
│   └── seller/
│       ├── SellerCard.jsx
│       └── SellerStory.jsx
├── pages/
│   ├── HomePage.jsx            ← hero + categories + featured + sellers
│   ├── BrowsePage.jsx          ← search + filter + product grid
│   ├── ProductPage.jsx         ← detail + Request Custom Order
│   ├── SellerPage.jsx          ← profile + story + products + reviews
│   ├── NotFoundPage.jsx
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   └── RegisterPage.jsx
│   ├── client/
│   │   ├── OrdersPage.jsx      ← my placed orders
│   │   ├── WishlistPage.jsx
│   │   └── ProfilePage.jsx
│   └── seller/
│       ├── SellerDashboard.jsx ← stats + incoming orders + add product
│       ├── SellerOrdersPage.jsx← incoming + outgoing tabs
│       └── SellerProfileEdit.jsx
├── context/
│   ├── AuthContext.jsx         ← already built
│   └── CartContext.jsx         ← can be removed (no cart in this platform)
├── services/
│   └── api.js                  ← already built
├── hooks/
│   ├── useProducts.js
│   ├── useOrders.js
│   └── useNotifications.js
├── router/
│   └── index.jsx               ← already built (needs updates)
├── i18n/
│   ├── index.js
│   └── locales/
│       ├── en.json
│       ├── fr.json
│       └── ar.json
└── utils/
    ├── formatPrice.js
    └── formatDate.js
```

---

## API ENDPOINTS USED BY FRONTEND

```javascript
// AUTH
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
PUT    /api/v1/auth/me

// PRODUCTS
GET    /api/v1/products                    → browse (public)
GET    /api/v1/products/:id                → detail (public)
GET    /api/v1/products/my-products        → seller's products
POST   /api/v1/products                    → create (seller)
PUT    /api/v1/products/:id               → update (seller)
DELETE /api/v1/products/:id               → delete (seller)

// CATEGORIES
GET    /api/v1/categories                  → list all (public)

// SELLERS
GET    /api/v1/sellers                     → browse (public)
GET    /api/v1/sellers/:id                 → public profile (public)
GET    /api/v1/sellers/me                  → own profile (seller)
GET    /api/v1/sellers/analytics           → stats (seller)
POST   /api/v1/sellers                     → create shop (seller)
PUT    /api/v1/sellers/:id                → update shop (seller)

// ORDERS
POST   /api/v1/orders                      → place order (any authenticated)
GET    /api/v1/orders                      → list (scoped by role)
GET    /api/v1/orders?as=client            → seller's own purchases
GET    /api/v1/orders/:id                  → detail
PATCH  /api/v1/orders/:id/status           → accept/reject (seller)

// REVIEWS
GET    /api/v1/reviews/product/:id         → product reviews (public)
GET    /api/v1/reviews/seller/:id          → seller ratings (public)
POST   /api/v1/reviews/product             → submit review (client)
POST   /api/v1/reviews/seller              → rate seller (client)

// WISHLIST
GET    /api/v1/wishlist
POST   /api/v1/wishlist
DELETE /api/v1/wishlist/:product_id

// NOTIFICATIONS
GET    /api/v1/notifications
GET    /api/v1/notifications/unread-count
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/mark-all-read

// UPLOADS
POST   /api/v1/uploads/image               → single image
POST   /api/v1/uploads/images              → multiple images
```

---

## PHASE BUILD ORDER — FRONTEND

```
Phase 1 — Foundation (already done)
├── STEP F1  ✅ Vite + React + TailwindCSS setup
├── STEP F2  ✅ Design system (tailwind.config.js + index.css)
├── STEP F3  ✅ src/services/api.js (Axios + interceptors)
├── STEP F4  ✅ src/context/AuthContext.jsx
├── STEP F5  ✅ src/router/index.jsx (basic)
├── STEP F6  ✅ src/App.jsx
└── STEP F7  ✅ src/main.jsx

Phase 2 — Layout & Navigation
├── STEP F8  ✅ src/components/layout/BottomNav.jsx (role-aware)
├── STEP F9  ✅ src/components/layout/TopBar.jsx
├── STEP F10 ✅ src/components/layout/DesktopNav.jsx
└── STEP F11 ✅ src/components/layout/MainLayout.jsx (updated)

Phase 3 — UI Components
├── STEP F12 ✅ src/components/ui/Spinner.jsx
├── STEP F13 ✅ src/components/ui/Badge.jsx
├── STEP F14 ✅ src/components/ui/StarRating.jsx
├── STEP F15 ✅ src/components/ui/Modal.jsx
└── STEP F16 ✅ src/utils/formatPrice.js + formatDate.js

Phase 4 — Product Components
├── STEP F17 ✅ src/components/product/ProductCard.jsx (price range + Request btn)
├── STEP F18 ✅ src/components/product/ProductGrid.jsx
└── STEP F19 ✅ src/components/product/ProductSkeleton.jsx

Phase 5 — Public Pages
├── STEP F20 ✅ src/pages/HomePage.jsx (hero + categories + products + sellers)
├── STEP F21 ✅ src/pages/BrowsePage.jsx (search + filter + grid)
├── STEP F22 ✅ src/pages/ProductPage.jsx (detail + custom order button)
├── STEP F23 ✅ src/pages/SellerPage.jsx (profile + story + products + reviews)
└── STEP F24 ✅ src/pages/NotFoundPage.jsx

Phase 6 — Auth Pages
├── STEP F25 ✅ src/pages/auth/LoginPage.jsx
└── STEP F26 ✅ src/pages/auth/RegisterPage.jsx

Phase 7 — Custom Order System (CORE FEATURE)
├── STEP F27 ⬜ src/components/order/CustomOrderForm.jsx
├── STEP F28 ✅ src/components/order/OrderCard.jsx
└── STEP F29 ⬜ src/components/order/OrderStatusBadge.jsx

Phase 8 — Client Pages
├── STEP F30 ✅ src/pages/client/OrdersPage.jsx (placed orders)
├── STEP F31 ✅ src/pages/client/WishlistPage.jsx
└── STEP F32 ✅ src/pages/client/ProfilePage.jsx

Phase 9 — Seller Pages
├── STEP F33 ✅ src/pages/seller/SellerDashboard.jsx (stats + orders + add product)
├── STEP F34 ✅ src/pages/seller/SellerOrdersPage.jsx (incoming + outgoing tabs)
└── STEP F35 ✅ src/pages/seller/SellerProfileEdit.jsx

Phase 10 — Router & Guards
└── STEP F36 ⬜ src/router/index.jsx (complete with all routes + guards)

Phase 11 — i18n (Arabic first, English + French later)
├── STEP F37 ⬜ src/i18n/index.js
└── STEP F38 ⬜ src/i18n/locales/ar.json (+ fr.json + en.json)

Phase 12 — Polish & Integration
├── STEP F39 ⬜ Full backend integration test
├── STEP F40 ⬜ Responsive design review
└── STEP F41 ⬜ Loading states + error handling
```

---

## IMPORTANT RULES FOR EVERY COMPONENT

```
✅ Always check isAuthenticated before showing protected actions
✅ Always use api.js service functions — never call fetch() directly
✅ Always show skeleton loaders while fetching data
✅ Always handle error states with a clear message
✅ Always use clsx for conditional class names
✅ Price always shown as: "X DA" or "X – Y DA" (range)
✅ "Request Custom Order" is the primary CTA — never "Add to Cart"
✅ No direct messaging between users — chatbot only
✅ Seller nav has Orders = incoming + outgoing combined
✅ "Add Product" lives in Profile/Dashboard, NOT in nav
```

---

## CUSTOM ORDER FORM — FIELD SPEC

```javascript
// POST /api/v1/orders body (updated schema):
{
  items: [{ product_id, quantity: 1 }],  // always quantity 1 for custom
  delivery_type: 'fast' | 'office_pickup' | 'hand_to_hand',
  payment_method: 'card' | 'cash_on_delivery',
  client_name: string,
  client_phone: string,
  client_address: string,
  notes: string,        // custom description goes here
  // Future (after DB update):
  // budget_min, budget_max, deadline, reference_images
}
```

---

## PRODUCT CARD DISPLAY RULES

```javascript
// What to show on ProductCard:
- Image (first from images array, or category emoji placeholder)
- Product name
- Seller shop name
- Price display:
  * If price_min AND price_max exist: "{price_min} – {price_max} DA"
  * If only price: "From {price} DA"
- Star rating (if avg_rating > 0)
- Heart button (wishlist toggle)
- "Request Custom Order" button (primary)
- Estimated time badge (if available)
```

---

## ORDER STATUS DISPLAY

```javascript
const ORDER_STATUS = {
  pending:   { label: 'Pending Review',  color: 'badge-warning' },
  accepted:  { label: 'Accepted',        color: 'badge-sage'    },
  rejected:  { label: 'Rejected',        color: 'badge-danger'  },
  completed: { label: 'Completed',       color: 'badge-info'    },
}
```

---

## TEST ACCOUNTS (for development)

```
Client:  norhane@hirftna.dz   / Test1234
Seller:  seller@hirftna.dz    / Test1234
         Shop: "Updated Hirftna Pottery"
         Seller ID: 6cb3dc42-b0a8-4f9a-a9ba-69b07b3785d5
         is_verified: true (set in Supabase)

Product: "Handmade Pottery Bowl"
         ID: 932125a7-ca17-45d5-a13e-7e444cd9fd8b
```

---

*Last updated: Phase 1 complete — starting Phase 2 Navigation*
*Backend: Phases 1–10 complete (40+ files, 39 endpoints)*
*Next: STEP F8 — BottomNav.jsx*
