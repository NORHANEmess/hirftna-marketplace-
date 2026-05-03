# HIRFTNA MARKETPLACE — Frontend Context
# Single source of truth for the React frontend
# Reference this file in every AI interaction using @FRONTEND_CONTEXT.md
# Update the progress tracker after every completed file

---

## PROJECT IDENTITY

- **Name:** Hirftna Marketplace (حرفتنا)
- **Type:** Custom-order artisan marketplace — NOT traditional e-commerce
- **Key Concept:** Products are custom, prices are ranges, orders are requests
- **Frontend Stack:** React 18 + Vite + TailwindCSS + React Router v6 + i18next
- **Backend:** Node.js/Express on port 4000 — all 40+ endpoints complete
- **Design:** Warm cream/beige palette, sage green accent, rounded corners, soft shadows, mobile-first, RTL-ready

---

## CORE CONCEPT — CUSTOM ORDER PLATFORM

```
❌ No fixed price       → Products show PRICE RANGE (price_min – price_max DA)
❌ No "Add to Cart"     → Primary CTA is "Request Custom Order"
❌ No direct chat       → Chatbot assistant for Q&A only
❌ No instant checkout  → Order = request → seller accepts → works → marks READY
                          → client confirms → COMPLETED → both rate each other
```

---

## DESIGN SYSTEM (CONFIGURED)

### Colors (tailwind.config.js)
```
cream:      50–500  ← page backgrounds (#FDF9F3 base)
beige:      100–500 ← borders, cards (#EDE0CC base)
sage:       50–900  ← primary accent (#728C67 = sage-500)
warm:       50–900  ← text, neutrals (#35322A = warm-800)
success:    #5C8A4A
warning:    #C4862A  ← stars, pending badges
danger:     #C0443A
info:       #3A6EA8
```

### Component Classes (src/index.css)
```
Buttons:   .btn .btn-primary .btn-secondary .btn-outline .btn-ghost .btn-danger .btn-sm .btn-lg
Cards:     .card .card-hover .card-flat
Forms:     .input .input-error .label
Badges:    .badge + variants: sage cream success warning danger info
Nav:       .pill-nav .pill-nav-track .pill-nav-tab .pill-nav-badge  ← floating bottom pill
Utilities: .text-balance .no-scrollbar .snap-x-mandatory .snap-start
Skeleton:  .skeleton  ← animated loading placeholder
```

---

## PRODUCT MODEL (ACTUAL BACKEND RESPONSE)

```javascript
{
  id, name, description,
  price,           // base/reference price (fallback)
  price_min,       // lower bound DA  ← IN DB ✅
  price_max,       // upper bound DA  ← IN DB ✅
  completion_days, // estimated days  ← IN DB ✅
  avg_rating, view_count, is_active, is_featured, is_new,
  category: { id, name, slug },
  seller: { id, shop_name, avg_rating, is_verified, avatar_url },
  images: [{ id, image_url, position }]   // ← field is image_url (NOT url)
}
```

### Price Display Rules
```javascript
// formatProductPrice(product):
if (price_min && price_max)  → "{price_min} – {price_max} DA"
if (price_min only)          → "From {price_min} DA"
if (price only)              → "From {price} DA"
```

---

## CUSTOM ORDER FLOW (FRONTEND VIEW)

```
Client:  ProductPage / ProductCard
         → clicks "Request Custom Order"
         → fires "open-order-form" custom event (picked up by global CustomOrderForm)
         → CustomOrderForm modal opens (3 steps):
              Step 1: Requirements (description/notes, budget_min, budget_max, deadline, reference_images)
              Step 2: Delivery (delivery_type, payment_method)
              Step 3: Contact (client_name, client_phone, client_address)
         → POST /api/v1/orders
         → Order status: PENDING

Seller:  SellerOrdersPage → sees incoming order
         → PATCH /api/v1/orders/:id/status  { status: 'accepted' | 'rejected' }
         → Works on order
         → PATCH /api/v1/orders/:id/ready   { final_price, delivery_type }
         → Notification sent to client: "order_ready"

Client:  OrdersPage → sees "Ready for Confirmation" badge
         → Views final_price + delivery details
         → PATCH /api/v1/orders/:id/complete
         → Order status: COMPLETED

Both:    After COMPLETED:
         Client → POST /api/v1/reviews/seller   { seller_id, rating, comment }
         Seller → POST /api/v1/client-ratings   { order_id, client_id, rating, comment }
```

---

## ORDER STATUS DISPLAY

```javascript
const ORDER_STATUS = {
  pending:   { label: 'Pending Review',       color: 'badge-warning', icon: ClockIcon      },
  accepted:  { label: 'Accepted',             color: 'badge-sage',    icon: CheckIcon       },
  rejected:  { label: 'Rejected',             color: 'badge-danger',  icon: XMarkIcon       },
  ready:     { label: 'Ready to Confirm',     color: 'badge-info',    icon: BellIcon        },  // NEW
  completed: { label: 'Completed',            color: 'badge-success', icon: StarIcon        },
}
```

---

## USER ROLES & NAVIGATION

### Role Detection (AuthContext)
```javascript
const isVisitor = !user
const isClient  = user?.role === 'client'
const isSeller  = user?.role === 'seller'   // seller can ALSO place orders as buyer
const isAdmin   = user?.role === 'admin'
```

### Bottom Nav (Mobile Floating Pill) — role-aware
```
Visitor:  Home | Browse | Categories | Login
Client:   Home | Browse | Wishlist  | Orders     | Profile
Seller:   Home | Browse | Orders    | Notifications | Profile
```

### Top Bar (Desktop)
```
Logo | Categories dropdown | Search bar | [Wishlist] [Orders] [Notifications badge] | Profile dropdown
```

---

## FRONTEND FOLDER STRUCTURE (ACTUAL STATE)

```
frontend/src/
├── assets/
├── components/
│   ├── layout/
│   │   ├── MainLayout.jsx      ✅ wraps all pages, polls unread count every 60s
│   │   ├── TopBar.jsx          ✅ logo + search + categories dropdown + desktop nav
│   │   ├── DesktopNav.jsx      ✅ desktop icons (wishlist, orders, notifications, profile)
│   │   └── BottomNav.jsx       ✅ mobile floating pill, role-aware
│   ├── product/
│   │   ├── ProductCard.jsx     ✅ price range + wishlist toggle + Request CTA
│   │   ├── ProductCardSkeleton.jsx ✅
│   │   ├── ProductGrid.jsx     ✅
│   │   └── ProductSkeleton.jsx ✅ full-page loading grid
│   ├── order/
│   │   ├── CustomOrderForm.jsx ✅ global modal, listens for "open-order-form" event
│   │   ├── OrderCard.jsx       ✅ expandable card, accept/reject actions for seller
│   │   └── OrderStatusBadge.jsx ✅ status pill with icon
│   ├── seller/
│   │   └── (seller components embedded in seller pages for now)
│   └── ui/
│       ├── Badge.jsx           ✅ sage/cream/warning/danger/info/success variants
│       ├── LanguageSwitcher.jsx ✅ AR/EN toggle with RTL support
│       ├── Modal.jsx           ✅ (exists)
│       ├── Spinner.jsx         ✅ xs/sm/md/lg/xl sizes
│       └── StarRating.jsx      ✅ read-only + interactive (for review forms)
├── pages/
│   ├── HomePage.jsx            ✅ hero + categories + featured products + sellers
│   ├── BrowsePage.jsx          ✅ search + category/price/sort filters + grid + pagination
│   ├── ProductPage.jsx         ✅ gallery + reviews + seller info + wishlist + Request btn
│   ├── SellerPage.jsx          ✅ public profile + story + products + ratings tabs
│   ├── NotFoundPage.jsx        ✅ 404 page
│   ├── NotificationsPage.jsx   ✅ shared notifications (new / earlier split)
│   ├── auth/
│   │   ├── LoginPage.jsx       ✅ email/password + OTP verification step
│   │   └── RegisterPage.jsx    ✅ role selection + password strength
│   ├── client/
│   │   ├── OrdersPage.jsx      ✅ placed orders with status filter tabs
│   │   ├── WishlistPage.jsx    ✅ saved products grid
│   │   ├── ProfilePage.jsx     ✅ profile + password change + seller shop edit (if seller)
│   │   └── NotificationsPage.jsx ✅ client-specific notifications (RTL Arabic labels)
│   └── seller/
│       ├── SellerDashboard.jsx ✅ stats + recent orders + quick actions
│       ├── SellerProducts.jsx  ✅ product CRUD (create/edit/delete/toggle visibility + images)
│       ├── SellerOrdersPage.jsx ✅ incoming + outgoing (as buyer) tabs
│       └── SellerProfileEdit.jsx ✅ shop profile + story + avatar upload
├── context/
│   ├── AuthContext.jsx         ✅ user, login, logout, OTP, changePassword
│   └── CartContext.jsx         ⛔ EMPTY — no cart in this platform, DELETE OR IGNORE
├── hooks/
│   ├── useApi.js               ✅ returns all API modules (useApi hook)
│   └── useAuth.js              ✅ re-exports useAuth from AuthContext
├── router/
│   └── index.jsx               ✅ all routes + RequireAuth + RequireSeller + GuestOnly guards
├── i18n/
│   ├── index.jsx               ✅ i18next setup, LanguageProvider, useTranslation hook
│   └── locales/
│       ├── ar.json             ✅ Arabic translations (RTL)
│       └── en.json             ✅ English translations
├── services/
│   └── api.js                  ✅ Axios client + all API modules (see below)
└── utils/
    ├── formatPrice.js          ✅ formatPrice, formatPriceRange, formatProductPrice, formatDate, formatRelativeTime, formatDeadline
    ├── productPrice.js         ✅ formatProductPrice (alias)
    └── validation.js           ✅ Zod schemas + payload parsers
```

---

## API MODULES IN api.js (COMPLETE LIST)

```javascript
authAPI:          register, login, verifyOtp, logout, getMe, updateMe, changePassword
productsAPI:      getAll, getById, getMyProducts, create, update, delete
ordersAPI:        getAll, getById, create, updateStatus
                  ⬜ markReady(id, { final_price, delivery_type })   ← ADD
                  ⬜ confirmComplete(id)                              ← ADD
categoriesAPI:    getAll, getById, getBySlug
sellersAPI:       getAll, getById, getMe, getAnalytics, create, update
reviewsAPI:       getProductReviews, getSellerRatings, getSellerReviews,
                  createReview, createRating, deleteReview
wishlistAPI:      getAll, add, remove, check
notificationsAPI: getAll, getUnreadCount, markRead, markAllRead, delete
uploadsAPI:       uploadImage, uploadImages
clientRatingsAPI: ⬜ create({ order_id, client_id, rating, comment })  ← ADD
                  ⬜ getByClient(client_id)                             ← ADD
```

---

## BACKEND API ENDPOINTS (USED BY FRONTEND)

```javascript
// AUTH
POST   /auth/register
POST   /auth/login
POST   /auth/verify-otp
POST   /auth/logout
GET    /auth/me
PUT    /auth/me
POST   /auth/change-password
POST   /auth/refresh

// PRODUCTS
GET    /products                      → browse (public, filters + pagination)
GET    /products/my-products          → seller's own products (BEFORE /:id route)
GET    /products/:id                  → detail (public)
POST   /products                      → create (seller)
PUT    /products/:id                  → update (seller)
DELETE /products/:id                  → delete (seller)

// CATEGORIES
GET    /categories                    → all (public)
GET    /categories/slug/:slug         → by slug (public)

// SELLERS
GET    /sellers                       → browse verified (public)
GET    /sellers/:id                   → public profile (public)
GET    /sellers/me                    → own full profile (seller)
GET    /sellers/analytics             → shop stats (seller)
POST   /sellers                       → create shop (seller)
PUT    /sellers/:id                   → update (seller)

// ORDERS
POST   /orders                        → create custom order (any auth)
GET    /orders                        → list (role-scoped: client sees own, seller sees incoming)
GET    /orders?as=client              → seller's own placed orders (as buyer)
GET    /orders/:id                    → detail (ownership checked)
PATCH  /orders/:id/status             → accept | reject (seller)
PATCH  /orders/:id/ready              → mark READY + final_price (seller)    ⬜ ADD to api.js
PATCH  /orders/:id/complete           → confirm completion (client)           ⬜ ADD to api.js

// REVIEWS & RATINGS
GET    /reviews/product/:id           → product reviews (public)
GET    /reviews/seller/:id            → seller ratings (public)
POST   /reviews/product               → create product review (client)
POST   /reviews/seller                → rate seller (client, after completed order)
DELETE /reviews/:id                   → delete own review (client)

// CLIENT RATINGS (NEW)
POST   /client-ratings                → seller rates client (after completed order)  ⬜ ADD to api.js
GET    /client-ratings/client/:id     → view client's ratings (public)              ⬜ ADD to api.js

// WISHLIST
GET    /wishlist                      → list (auth)
POST   /wishlist                      → add (auth)
GET    /wishlist/:product_id/check    → check status (auth)
DELETE /wishlist/:product_id          → remove (auth)

// NOTIFICATIONS
GET    /notifications                 → list paginated (auth)
GET    /notifications/unread-count    → count (auth)
PATCH  /notifications/:id/read        → mark one read (auth)
PATCH  /notifications/mark-all-read   → mark all read (auth)
DELETE /notifications/:id             → delete (auth)

// UPLOADS
POST   /uploads/image                 → single image (auth)
POST   /uploads/images                → up to 5 images (auth)
```

---

## CUSTOM ORDER FORM — ACTUAL FIELD SPEC

```javascript
// POST /api/v1/orders body:
{
  items: [{ product_id: string, quantity: 1 }],  // always 1 for custom orders
  notes: string,              // custom description / requirements
  budget_min: number,         // client's min budget (DA)
  budget_max: number,         // client's max budget (DA)
  deadline: string,           // ISO date string (YYYY-MM-DD)
  reference_images: string[], // array of uploaded Supabase Storage URLs (optional)
  delivery_type: 'fast' | 'office_pickup' | 'hand_to_hand',
  payment_method: 'card' | 'cash_on_delivery',
  client_name: string,
  client_phone: string,
  client_address: string,
}
```

---

## KEY ARCHITECTURAL PATTERNS

```
1. Global CustomOrderForm
   → Mounted in router/index.jsx at root (outside <Outlet>)
   → Listens for window event: "open-order-form" { detail: { product } }
   → ProductCard and ProductPage fire this event

2. API Response Normalization
   → All responses pass through normalizeApiResponse() / extractApiItems()
   → Handles variable response shapes (data as array vs. object with items key)

3. Token Refresh Queue
   → On 401, api.js pauses requests and refreshes token
   → All queued requests replay with new token after refresh

4. OTP / 2FA
   → Login returns { requiresOtp: true } if 2FA enabled
   → LoginPage switches to OTP input step
   → POST /auth/verify-otp → returns full session

5. Seller Dual Role
   → Sellers can place orders as buyers
   → GET /orders?as=client → returns seller's own placed orders

6. i18n + RTL
   → LanguageProvider in main.jsx
   → AR language sets dir="rtl" on document root
   → All text uses useTranslation() hook

7. Event-Based Wishlist
   → ProductCard fires optimistic toggle before API confirms
   → Parent pages listen for wishlist changes via onWishlistToggle prop
```

---

## IMPORTANT RULES FOR EVERY COMPONENT

```
✅ Always check authentication before showing protected actions
✅ Always use api.js service functions — never call fetch() directly
✅ Always show skeleton loaders while fetching data
✅ Always handle error states with a clear message
✅ Price always shown as "X DA" or "X – Y DA" (never just a number)
✅ "Request Custom Order" is the primary CTA — never "Add to Cart"
✅ No direct messaging between users — chatbot assistant only
✅ Use req.validated pattern: data always comes from API, never from raw user input
✅ image_url is the field name on product_images (not "url")
✅ Seller role: sellers can also place orders — treat them like clients for buying
✅ CartContext is empty and unused — do not reference it
```

---

## PHASE BUILD ORDER — FRONTEND

```
Phase 1 — Foundation ✅ COMPLETE
├── F1  ✅ Vite + React + TailwindCSS setup
├── F2  ✅ Design system (tailwind.config.js + index.css)
├── F3  ✅ src/services/api.js
├── F4  ✅ src/context/AuthContext.jsx
├── F5  ✅ src/router/index.jsx
├── F6  ✅ src/App.jsx
└── F7  ✅ src/main.jsx (React StrictMode removed — causes double API calls)

Phase 2 — Layout & Navigation ✅ COMPLETE
├── F8  ✅ BottomNav.jsx (floating pill, role-aware)
├── F9  ✅ TopBar.jsx (logo + search + categories + mobile menu)
├── F10 ✅ DesktopNav.jsx (icons + profile dropdown)
└── F11 ✅ MainLayout.jsx (polls unread count every 60s)

Phase 3 — UI Components ✅ COMPLETE
├── F12 ✅ Spinner.jsx (xs/sm/md/lg/xl)
├── F13 ✅ Badge.jsx (sage/cream/success/warning/danger/info variants)
├── F14 ✅ StarRating.jsx (read-only + interactive)
├── F15 ✅ Modal.jsx
├── F16 ✅ LanguageSwitcher.jsx (AR/EN + RTL)
└── F17 ✅ formatPrice.js + formatDate.js + validation.js

Phase 4 — Product Components ✅ COMPLETE
├── F18 ✅ ProductCard.jsx (price range + wishlist + Request CTA)
├── F19 ✅ ProductGrid.jsx
├── F20 ✅ ProductSkeleton.jsx
└── F21 ✅ ProductCardSkeleton.jsx

Phase 5 — Public Pages ✅ COMPLETE
├── F22 ✅ HomePage.jsx (hero + categories + products + sellers)
├── F23 ✅ BrowsePage.jsx (search + filter + grid + pagination)
├── F24 ✅ ProductPage.jsx (gallery + reviews + seller info + Request btn)
├── F25 ✅ SellerPage.jsx (profile + story + products + reviews)
└── F26 ✅ NotFoundPage.jsx

Phase 6 — Auth Pages ✅ COMPLETE
├── F27 ✅ LoginPage.jsx (email/password + OTP step)
└── F28 ✅ RegisterPage.jsx (role selection + password strength)

Phase 7 — Custom Order System ✅ COMPLETE
├── F29 ✅ CustomOrderForm.jsx (global modal, 3-step, budget/deadline/reference images)
├── F30 ✅ OrderCard.jsx (expandable, accept/reject for seller)
└── F31 ✅ OrderStatusBadge.jsx (pending/accepted/rejected/ready/completed)

Phase 8 — Client Pages ✅ COMPLETE
├── F32 ✅ OrdersPage.jsx (client's placed orders + status filter)
├── F33 ✅ WishlistPage.jsx (saved products)
├── F34 ✅ ProfilePage.jsx (profile + password + seller shop edit)
└── F35 ✅ client/NotificationsPage.jsx (Arabic RTL labels)

Phase 9 — Seller Pages ✅ COMPLETE
├── F36 ✅ SellerDashboard.jsx (stats + recent orders + quick actions)
├── F37 ✅ SellerProducts.jsx (CRUD + image upload + visibility toggle)
├── F38 ✅ SellerOrdersPage.jsx (incoming + outgoing tabs)
└── F39 ✅ SellerProfileEdit.jsx (shop + story + avatar)

Phase 10 — Router & i18n ✅ COMPLETE
├── F40 ✅ router/index.jsx (all routes + role guards + global CustomOrderForm)
├── F41 ✅ i18n/index.jsx (i18next, AR + EN, RTL)
└── F42 ✅ i18n/locales/ar.json + en.json

Phase 11 — Order READY / COMPLETE Flow (NEW — needs work)
├── F43 ⬜ Add ordersAPI.markReady() to api.js
├── F44 ⬜ Add ordersAPI.confirmComplete() to api.js
├── F45 ⬜ Update OrderCard.jsx — seller sees "Mark as Ready" button (when accepted)
├── F46 ⬜ Update OrderCard.jsx — client sees "Confirm Completion" button (when ready)
├── F47 ⬜ Update OrderStatusBadge — add 'ready' status
└── F48 ⬜ Update OrdersPage + SellerOrdersPage — handle new statuses

Phase 12 — Client Ratings (seller rates client — NEW)
├── F49 ⬜ Add clientRatingsAPI to api.js (create + getByClient)
├── F50 ⬜ RateClientModal.jsx — seller rates client after COMPLETED order
└── F51 ⬜ Update SellerOrdersPage — show "Rate Client" button on completed orders

Phase 13 — Notifications Polish (NEW types)
└── F52 ⬜ Handle 'order_ready' and 'order_completed' notification types in UI

Phase 14 — Final Polish
├── F53 ⬜ Full backend integration test (all flows end-to-end)
├── F54 ⬜ Responsive design review (mobile → tablet → desktop)
└── F55 ⬜ Error boundaries + loading state review
```

---

## TEST ACCOUNTS (development)

```
Client:  norhane@hirftna.dz  / Test1234
Seller:  seller@hirftna.dz   / Test1234
         Shop: "Updated Hirftna Pottery"
         Seller ID: 6cb3dc42-b0a8-4f9a-a9ba-69b07b3785d5
         is_verified: true

Product: "Handmade Pottery Bowl"
         ID: 932125a7-ca17-45d5-a13e-7e444cd9fd8b
```

---

## BACKEND ALIGNMENT — WHAT STILL NEEDS WIRING

### Backend endpoints NOT yet in api.js (must add):
```javascript
// In api.js — ordersAPI:
markReady:       (id, body) => api.patch(`/orders/${id}/ready`, body)
confirmComplete: (id)       => api.patch(`/orders/${id}/complete`)

// In api.js — new clientRatingsAPI object:
clientRatingsAPI: {
  create:      (body)      => api.post('/client-ratings', body),
  getByClient: (clientId)  => api.get(`/client-ratings/client/${clientId}`)
}
```

### Backend endpoints that DON'T EXIST yet (must build first):
```
PATCH /orders/:id/ready       → order.service.markReady()   ← not built yet
PATCH /orders/:id/complete    → order.service.confirmComplete() ← not built yet
POST  /client-ratings         → clientRating.service.create()  ← not built yet
GET   /client-ratings/client/:id                               ← not built yet
```

---

*Last updated: 2026-05-02*
*Phases 1–10 complete (48 files). Next: Phase 11 (Order Ready/Complete flow) + Phase 12 (Client Ratings)*
*Backend: Phases 1–10 complete. Phases 11 (client ratings) + order ready/complete endpoints still needed.*
