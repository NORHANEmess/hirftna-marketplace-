# HIRFTNA MARKETPLACE — Frontend Context
# Single source of truth for the React frontend
# Reference this file in every AI interaction using @FRONTEND_CONTEXT.md
# Update the progress tracker after every completed file

---

## PROJECT IDENTITY

- **Name:** Hirftna Marketplace (حرفتنا)
- **Type:** Custom-order artisan marketplace — NOT traditional e-commerce
- **Key Concept:** Products are custom, prices are ranges, orders are requests
- **Frontend Stack:** React 19.2.4 + Vite + TailwindCSS + React Router v7 + i18next
- **Backend:** Node.js/Express on port 4000 — all 60+ endpoints complete (Phases 1–14)
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

### Animation System (src/index.css — added 2026-05-17)
```
Keyframes:  fadeInUp, fadeInDown, fadeInLeft, fadeInRight, heartBeat
Classes:    .animate-fade-in-up  .animate-fade-in-down  .animate-fade-in-left  .animate-fade-in-right
            .animate-heart-beat
Delays:     .delay-75  .delay-100  .delay-150  .delay-200  .delay-300  .delay-400  .delay-500
Hover:      .hover-lift          → translateY(-4px) + deeper shadow on hover
Scroll:     .reveal + .in-view   → opacity+translateY transition (Intersection Observer)
Motion:     prefers-reduced-motion disables ALL animations globally
RTL:        [dir="rtl"] swaps fadeInLeft ↔ fadeInRight automatically
```

### Typography
```
font-sans:  "Plus Jakarta Sans", "Readex Pro", system-ui, sans-serif
            → [dir="rtl"] activates Readex Pro as primary (Arabic-optimized)
            → Defined in tailwind.config.js as the font-sans stack (NOT Inter)
font-logo:  Inter (500–700) — loaded in index.html for LogoMark "MARKETPLACE" wordmark only
font-ar:    Amiri (400, 700) — loaded in index.html for Arabic logo text "حرفتنا"
NOTE: Playfair Display is NOT in tailwind.config.js — all headings use Plus Jakarta Sans.
      Inter is NOT a body font; it only appears in the logo Latin wordmark.
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
const isAdmin   = user?.role === 'admin'    // admin role set directly in DB only
```

### Route Guards (router/index.jsx)
```
RequireAuth      → any authenticated user (client OR seller OR admin)
RequireNotAdmin  → authenticated + role≠admin — /wishlist, /orders (blocks admins; redirects to /admin)
RequireSeller    → authenticated + role=seller — /seller/* routes
GuestOnly        → not authenticated — /login, /register, /forgot-password, /reset-password
RequireAdmin     → authenticated + role=admin — /admin, /admin/users, /admin/products
NOTE: /wishlist and /orders use RequireNotAdmin (NOT RequireAuth) — admins are redirected away.
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
│   ├── auth/
│   │   └── (auth sub-components if any)
│   ├── chatbot/
│   │   └── ChatbotWidget.jsx   ✅ floating widget (authenticated users only), Gemini backend
│   ├── layout/
│   │   ├── MainLayout.jsx      ✅ wraps all pages, polls unread count every 120s (pauses when tab hidden)
│   │   ├── TopBar.jsx          ✅ logo + search + categories dropdown + desktop nav
│   │   ├── DesktopNav.jsx      ✅ desktop icons (wishlist, orders, notifications, profile)
│   │   └── BottomNav.jsx       ✅ mobile floating pill, role-aware
│   ├── product/
│   │   ├── ProductCard.jsx     ✅ price range + wishlist toggle + Request CTA + hover-lift + heart pulse animation
│   │   ├── ProductCardSkeleton.jsx ✅
│   │   ├── ProductGrid.jsx     ✅
│   │   └── ProductSkeleton.jsx ✅ full-page loading grid
│   ├── order/
│   │   ├── CustomOrderForm.jsx ✅ global modal, listens for "open-order-form" event
│   │   ├── OrderCard.jsx       ✅ accept/reject/ready/complete + rate both parties
│   │   ├── OrderStatusBadge.jsx ✅ pending/accepted/rejected/ready/completed
│   │   └── RateClientModal.jsx ✅ seller rates client after completed order
│   ├── seller/
│   │   └── (seller components embedded in seller pages for now)
│   └── ui/
│       ├── Badge.jsx           ✅ sage/cream/warning/danger/info/success variants
│       ├── LanguageSwitcher.jsx ✅ AR/EN toggle with RTL support
│       ├── Modal.jsx           ✅
│       ├── Spinner.jsx         ✅ xs/sm/md/lg/xl sizes
│       ├── StarRating.jsx      ✅ read-only + interactive (for review forms)
│       └── Toast.jsx           ✅ shared toast notification (replaces 3 local copies)
├── pages/
│   ├── HomePage.jsx            ✅ split-screen hero (HeroLeft+HeroRight) + HowItWorksSection (4-step scroll-animated) + featured products (staggered reveals) + sellers
│   ├── BrowsePage.jsx          ✅ search + category/price/sort filters + grid + pagination
│   ├── ProductPage.jsx         ✅ gallery + reviews + seller info + wishlist + Request btn
│   ├── SellerPage.jsx          ✅ public profile + story + products + ratings tabs
│   ├── ClientProfilePage.jsx   ✅ public client profile (viewable by sellers)
│   ├── NotFoundPage.jsx        ✅ 404 page
│   ├── NotificationsPage.jsx   ✅ shared notifications (new / earlier split)
│   ├── auth/
│   │   ├── LoginPage.jsx       ✅ email/password only (no OTP step); verified banner on redirect
│   │   ├── RegisterPage.jsx    ✅ role selection + password strength + OTP verification
│   │   ├── ForgotPasswordPage.jsx ✅ send reset email
│   │   └── ResetPasswordPage.jsx  ✅ reset with token from email link
│   ├── client/
│   │   ├── OrdersPage.jsx      ✅ placed orders with status filter tabs + complete action
│   │   ├── WishlistPage.jsx    ✅ saved products grid + error toast
│   │   └── ProfilePage.jsx     ✅ profile + password change + seller shop edit (if seller)
│   ├── seller/
│   │   ├── SellerDashboard.jsx  ✅ stats + recent orders + quick actions + activation banner + boost link
│   │   ├── SellerProducts.jsx   ✅ product CRUD (create/edit/delete/toggle) + unverified warning banner
│   │   ├── SellerOrdersPage.jsx ✅ incoming + outgoing (as buyer) tabs + ready action
│   │   ├── SellerProfileEdit.jsx ✅ shop profile + story + avatar upload (error toast)
│   │   └── SellerPromotions.jsx ✅ submit/view promotion request (pending/active/expired/rejected states)
│   └── admin/
│       ├── AdminDashboard.jsx   ✅ stat cards + bar charts + top sellers/products + Promotions nav link
│       ├── AdminUsers.jsx       ✅ paginated user list + role filter + verify/revoke seller
│       ├── AdminProducts.jsx    ✅ paginated ALL products (active+inactive) + delete modal
│       └── AdminPromotions.jsx  ✅ list + activate/reject promotions with confirm modal
├── components/
│   └── hero/
│       └── HeroCarousel.jsx    ✅ auto-advancing hero carousel (touch swipe, reduced-motion, dots)
├── context/
│   ├── AuthContext.jsx         ✅ user, login, logout, OTP, changePassword, forgotPassword, resetPassword
│   └── CartContext.jsx         ⛔ EMPTY — no cart in this platform, DELETE OR IGNORE
├── hooks/
│   ├── useApi.js               ✅ returns all API modules (useApi hook)
│   ├── useAuth.js              ✅ re-exports useAuth from AuthContext
│   └── useInView.js            ✅ IntersectionObserver hook — fire-once pattern → returns [ref, isInView]
├── router/
│   └── index.jsx               ✅ all routes + RequireAuth + RequireSeller + GuestOnly + RequireAdmin
├── i18n/
│   ├── index.jsx               ✅ i18next setup, LanguageProvider, useTranslation hook
│   └── locales/
│       ├── ar.json             ✅ Arabic translations (RTL) — includes chatbot.* + admin.* + auth.*
│       └── en.json             ✅ English translations — includes chatbot.* + admin.* + auth.*
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
authAPI:          register, login, verifyOtp, logout, getMe, updateMe, changePassword,
                  forgotPassword, resetPassword
productsAPI:      getAll, getById, getMyProducts, create, update, delete
ordersAPI:        getAll, getById, create, updateStatus, markReady, confirmComplete
categoriesAPI:    getAll, getById, getBySlug
sellersAPI:       getAll, getById, getMe, getAnalytics, getVerificationStatus, create, update
reviewsAPI:       getProductReviews, getSellerRatings,
                  createReview, createRating, deleteReview
wishlistAPI:      getAll, add, remove, check
notificationsAPI: getAll, getUnreadCount, markRead, markAllRead, delete
uploadsAPI:       uploadImage, uploadImages
clientRatingsAPI: create({ order_id, client_id, rating, comment }), getByClient(clientId)
chatbotAPI:       sendMessage(message, conversationHistory)
promotionsAPI:    getHeroAds(), getBrowseAds(), getFeaturedProducts(params),
                  request(data), getMe(), getMyProductPromotions()
adminAPI:         getUsers(params), getProducts(params), getStats(),
                  verifySeller(sellerId, isVerified), deleteProduct(productId),
                  updateUserRole(userId, role),
                  getPromotions(params), activatePromotion(id), rejectPromotion(id, reason)
```

---

## BACKEND API ENDPOINTS (USED BY FRONTEND)

```javascript
// AUTH
POST   /auth/register
POST   /auth/login
POST   /auth/verify-otp          (registration OTP only — not used on login)
POST   /auth/logout
GET    /auth/me
PUT    /auth/me
POST   /auth/change-password
POST   /auth/refresh
POST   /auth/forgot-password     (rate-limited 5/15min; sends reset email)
POST   /auth/reset-password      (32-byte hex token, 15-min TTL)

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
GET    /sellers                            → browse all sellers (public)
GET    /sellers/:id                        → public profile (public)
GET    /sellers/me                         → own full profile (seller)
GET    /sellers/me/verification-status     → own verification status (seller)
GET    /sellers/analytics                  → shop stats (seller)
POST   /sellers                            → create shop (seller)
PUT    /sellers/:id                        → update (seller)

// ORDERS
POST   /orders                        → create custom order (any auth)
GET    /orders                        → list (role-scoped: client sees own, seller sees incoming)
GET    /orders?as=client              → seller's own placed orders (as buyer)
GET    /orders/:id                    → detail (ownership checked)
PATCH  /orders/:id/status             → accept | reject (seller)
PATCH  /orders/:id/ready              → mark READY + final_price (seller)
PATCH  /orders/:id/complete           → confirm completion (client)

// REVIEWS & RATINGS
GET    /reviews/product/:id           → product reviews (public)
GET    /reviews/seller/:id            → seller ratings (public)
POST   /reviews/product               → create product review (client)
POST   /reviews/seller                → rate seller (client, after completed order)
DELETE /reviews/:id                   → delete own review (client)

// CLIENT RATINGS
POST   /client-ratings                → seller rates client (after completed order)
GET    /client-ratings/client/:id     → view client's ratings (public)

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

// CHATBOT
POST   /chatbot                       → send message (auth, 20/hr per user)
                                        Body: { message, conversation_history[] }

// PROMOTIONS
GET    /promotions/hero                     → active hero placement ads (public)
GET    /promotions/browse                   → active browse placement ads (public)
GET    /promotions/featured-products        → promoted featured products (public, filterable)
POST   /promotions/request                  → submit promotion request (seller)
GET    /promotions/me                       → own promotion status (seller)
GET    /promotions/my-product-promotions    → own per-product promotions (seller)

// ADMIN (all require role=admin)
GET    /admin/users                        → list users paginated (role + search filter)
GET    /admin/products                     → list ALL products (active + inactive) paginated
GET    /admin/stats                        → platform stats (users/products/orders/revenue/top5)
PATCH  /admin/sellers/:id/verify           → set is_verified true/false
DELETE /admin/products/:id                 → force-delete any product
PATCH  /admin/users/:id/role               → change role to client|seller (not admin)
GET    /admin/promotions                   → list promotion requests (paginated, filter by status)
PATCH  /admin/promotions/:id/activate      → activate promotion (sets is_active=true + ends_at)
PATCH  /admin/promotions/:id/reject        → reject promotion with rejection_reason
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

## i18n CONFIGURATION

```
Library:         react-i18next
Namespace:       Single 'translation' namespace (NOT multi-namespace)
                 All keys are nested paths within one JSON: orders.statuses.ready, customOrder.title, etc.
Languages:       ['ar', 'en'] only — French is COMPLETELY ABSENT (not disabled, not partial)
Storage key:     hirftna_lang (localStorage)
Default:         'ar' (Arabic)
RTL:             AR sets dir="rtl" on document.documentElement
useTranslation() returns { ...translation, lang, setLang, isRTL }
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

4. OTP / 2FA (registration-only)
   → RegisterPage collects email/password → POST /auth/register
   → If AUTH_OTP_ENABLED=true, OTP email sent (nodemailer + SMTP)
   → RegisterPage shows inline OTP input → POST /auth/verify-otp
   → On success: navigate('/login', { state: { verified: true } })
   → LoginPage shows green verified banner if state.verified
   → Login never triggers OTP — 403 returned if email not confirmed

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
└── F11 ✅ MainLayout.jsx (polls unread count every 120s; pauses when document.hidden)

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
├── F27 ✅ LoginPage.jsx (email/password only; verified banner from register; 403 amber warning)
├── F28 ✅ RegisterPage.jsx (role selection + password strength + OTP verify inline)
├── F29 ✅ ForgotPasswordPage.jsx (GuestOnly, send reset email)
└── F30 ✅ ResetPasswordPage.jsx (GuestOnly, validates hex token, new password form)

Phase 7 — Custom Order System ✅ COMPLETE
├── F31 ✅ CustomOrderForm.jsx (global modal, 3-step, budget/deadline/reference images)
├── F32 ✅ OrderCard.jsx (accept/reject/ready/complete + rate seller + rate client)
│          canRateSeller checks user.role === 'client' (sellers viewing don't see it)
└── F33 ✅ OrderStatusBadge.jsx (pending/accepted/rejected/ready/completed)

Phase 8 — Client Pages ✅ COMPLETE
├── F34 ✅ OrdersPage.jsx (client's placed orders + status filter + confirm complete)
├── F35 ✅ WishlistPage.jsx (saved products + error toast on load failure)
└── F36 ✅ ProfilePage.jsx (profile + password + seller shop edit)

Phase 9 — Seller Pages ✅ COMPLETE
├── F37 ✅ SellerDashboard.jsx (stats + recent orders + quick actions)
├── F38 ✅ SellerProducts.jsx (CRUD + image upload + visibility toggle)
├── F39 ✅ SellerOrdersPage.jsx (incoming + outgoing tabs + mark ready action)
└── F40 ✅ SellerProfileEdit.jsx (shop + story + avatar; AvatarUploader has onError → toast)

Phase 10 — Router & i18n ✅ COMPLETE
├── F41 ✅ router/index.jsx (all routes + RequireAuth + RequireSeller + GuestOnly + RequireAdmin)
├── F42 ✅ i18n/index.jsx (i18next, AR + EN, RTL)
└── F43 ✅ i18n/locales/ar.json + en.json (includes chatbot.* + admin.* + auth.* keys)

Phase 11 — Order READY / COMPLETE + Client Ratings ✅ COMPLETE
├── F44 ✅ ordersAPI.markReady + confirmComplete added to api.js
├── F45 ✅ OrderCard.jsx — seller "Mark as Ready" (accepted), client "Confirm Complete" (ready)
├── F46 ✅ RateClientModal.jsx — seller rates client after completed order
└── F47 ✅ clientRatingsAPI added to api.js (create + getByClient)

Phase 12 — AI Chatbot ✅ COMPLETE
├── F48 ✅ ChatbotWidget.jsx — floating sage button (bottom-right, authenticated only)
│          Panel: 380px desktop / full-width mobile / 500px height
│          Typing indicator, suggestion chips, conversation history, Enter to send
└── F49 ✅ chatbotAPI.sendMessage added to api.js

Phase 13 — Admin Dashboard ✅ COMPLETE
├── F50 ✅ AdminDashboard.jsx at /admin (RequireAdmin) — stat cards + charts + top5 tables + Promotions nav link
├── F51 ✅ AdminUsers.jsx at /admin/users — paginated, role filter, verify/revoke seller
├── F52 ✅ AdminProducts.jsx at /admin/products — all products (active+inactive), delete modal
└── F53 ✅ adminAPI (getUsers, getProducts, getStats, verifySeller, deleteProduct, updateUserRole, getPromotions, activatePromotion, rejectPromotion)

Phase 14 — UI Polish ✅ COMPLETE
├── F54 ✅ Toast.jsx shared component at components/ui/Toast.jsx
├── F55 ✅ WishlistPage + NotificationsPage — error toast on load failure
└── F56 ✅ SellerProfileEdit — AvatarUploader onError prop shows toast

Phase 16 — Seller Activation + Promotions ✅ COMPLETE
├── F57 ✅ SellerDashboard.jsx — earn-badge info card (informational only; all sellers can sell without verification)
├── F58 ✅ SellerProducts.jsx — all products visible; no unverified warning banner
├── F59 ✅ SellerPromotions.jsx at /seller/promotions (RequireSeller) — submit/view promotion status
├── F60 ✅ HeroCarousel.jsx — auto-advancing carousel with touch swipe + reduced-motion support
├── F61 ✅ HomePage.jsx — hero carousel when promotions active, static hero fallback
├── F62 ✅ BrowsePage.jsx — promoted sellers strip above product grid
├── F63 ✅ AdminPromotions.jsx at /admin/promotions (RequireAdmin) — list + activate/reject
├── F64 ✅ router/index.jsx — /seller/promotions + /admin/promotions routes added
└── F65 ✅ promotionsAPI added to api.js (getHeroAds, getBrowseAds, request, getMe)

Phase 17 — Final Polish ✅ COMPLETE (2026-05-19)
├── F66 ✅ Full payment flow — two separate components:
│          PaymentModal (seller → platform): src/components/payment/PaymentModal.jsx
│            Opened from SellerDashboard activation banner ("Pay Activation Fee")
│            Opened after SellerPromotions hero request success
│            CCP/BaridiMob transfer details; Chargily card disabled (coming soon)
│          PaymentStep (client → seller): src/components/order/OrderCard.jsx
│            Intercepts "Confirm Complete" on READY orders
│            Cash: confirm received + paid → calls confirmComplete
│            Card: simulated 2s spinner → success → auto-calls confirmComplete
├── F67 ✅ Logo verified: Amiri font added to index.html Google Fonts
│          LogoMark updated to use i18n keys: common.appNameArabic / common.appNameLatin
│          common.appNameArabic = "حرفتنا", common.appNameLatin = "MARKETPLACE"
│          i18n keys updated in both en.json and ar.json
├── F68 ✅ ErrorBoundary: src/components/ErrorBoundary.jsx (class component)
│          Wraps entire app in App.jsx — catches all unhandled render errors
│          Shows friendly error UI with Refresh Page button
├── F69 ✅ Loading/error/empty states added to ALL pages:
│          OrdersPage (client): added error state + retry button
│          BrowsePage: added fetchError state + error UI with retry
│          NotificationsPage: added fetchError state + Arabic error message
│          SellerOrdersPage: added incomingError state + retry button
│          (All other pages already had full 3-state coverage)
└── F70 ✅ payment.* i18n keys added to en.json + ar.json (27 keys total)

Phase 18 — Homepage Redesign + Animation System ✅ COMPLETE (2026-05-17)
├── F69 ✅ index.html — Plus Jakarta Sans + Readex Pro + Amiri + Inter Google Fonts loaded
├── F70 ✅ tailwind.config.js — font-sans: ["Plus Jakarta Sans", "Readex Pro", system-ui, sans-serif]
│          NOTE: No font-display key in config; no Playfair Display in Tailwind config.
├── F71 ✅ src/index.css — full animation system:
│          Keyframes: fadeInUp, fadeInDown, fadeInLeft, fadeInRight, heartBeat
│          Classes: .animate-fade-in-up/down/left/right, .animate-heart-beat
│          Delays: .delay-75/100/150/200/300/400/500
│          .hover-lift (translateY -4px + shadow, GPU-safe)
│          .reveal + .in-view (scroll-triggered via IntersectionObserver)
│          prefers-reduced-motion disables ALL animations globally
│          [dir="rtl"] swaps fadeInLeft ↔ fadeInRight
├── F72 ✅ src/hooks/useInView.js — IntersectionObserver fire-once hook → [ref, isInView]
├── F73 ✅ src/pages/HomePage.jsx — complete redesign:
│          Split-screen hero (50/50 desktop, stacked mobile)
│          HeroLeft: headline (Plus Jakarta Sans) + search bar → /browse?search= + CTA
│          HeroRight: featured artisan card from heroAds (random) with fallback
│          HeroSkeleton during loading; entrance animations staggered
│          HowItWorksSection: 4-step scroll-triggered (useInView), SVG icons, step circles
│          WhatIsHirftna: scroll-triggered fade-in
│          Featured products + seller cards: staggered reveal via useInView
│          HeroCarousel removed from HomePage (moved to promotions-only context)
└── F74 ✅ src/components/product/ProductCard.jsx:
           .hover-lift replaces manual hover:-translate-y-0.5 + transition-all
           .animate-heart-beat fires on wishlist toggle (300ms pulse, reverts via setTimeout)
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

## DESIGN CONSTRAINTS (INTENTIONAL — NOT BUGS)

```
- requireRole('client') on /complete: sellers who buy cannot confirm completion
- POST /reviews/seller requires role=client: sellers who buy cannot rate sellers
- OTP only on registration: AUTH_OTP_ENABLED=false disables all OTP behavior
- ChatbotWidget only for authenticated users: guests don't see it
- Admin role cannot be assigned via API: must be set directly in Supabase DB
- AdminProducts.jsx uses GET /admin/products (all products): NOT the public endpoint
- canRateSeller in OrderCard checks user.role === 'client': sellers don't see it
```

---

---

## DEPLOYMENT

```
Status:     DEPLOYED (2026-05-20)
Live URL:   https://hirftna.vercel.app   (Vercel)
Backend:    https://hirftna-backend.onrender.com  (Render)
```

**Vercel env vars:**
```
VITE_API_URL=https://hirftna-backend.onrender.com/api/v1
VITE_SUPABASE_URL=https://azjeomrahtmaeergfffh.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

---

## CHANGELOG

### 2026-05-20 — Production Deployment + RTL Fixes

- Deployed to https://hirftna.vercel.app (Vercel) + https://hirftna-backend.onrender.com (Render)
- **TopBar.jsx — MobileCategoriesSheet RTL fix:**
  * Added `justify-between` to each category row
  * Added `ChevronRight` with `rtl:rotate-180` class as trailing indicator
  * Wrapped icon+label in `<div className="flex items-center gap-4 min-w-0">` to enable proper truncation
  * Imported `ChevronRight` from lucide-react
- **RegisterPage.jsx — RTL input icons fix:**
  * All leading icon positions: `left-3.5` → `start-3.5`
  * All trailing eye button positions: `right-3.5` → `end-3.5`
  * Input padding-start: `pl-10` → `ps-10`
  * Input padding-end: `pr-11` → `pe-11`
  * Applies to: Full Name, Email, Password, Confirm Password inputs
- **LoginPage.jsx — same RTL input icons fix:**
  * Email input: `left-3.5` → `start-3.5`, `pl-10` → `ps-10`
  * Password input: `left-3.5` → `start-3.5`, `right-3.5` → `end-3.5`, `pl-10 pr-11` → `ps-10 pe-11`

### 2026-05-19 — Phase 19 Final Polish
- PaymentModal + PaymentStep, ErrorBoundary, i18n payment keys, Amiri font

---

*Last updated: 2026-05-24*
*Frontend Phases 1–14, 16, 17, and 18 complete. All backend endpoints wired. Deployed to production.*
*Admin account: set role='admin' directly in Supabase DB. Chatbot: requires GEMINI_API_KEY in backend .env.*
*Animation note: all animations respect prefers-reduced-motion. RTL swaps fadeInLeft ↔ fadeInRight automatically.*
*Font note: body font is Plus Jakarta Sans (LTR) / Readex Pro (RTL). Playfair Display is NOT used. Inter is logo Latin wordmark only. Amiri is logo Arabic text only.*
*i18n note: single 'translation' namespace; AR + EN only; French is completely absent.*
*Payment: PaymentModal (seller→platform) and PaymentStep (client→seller) are SEPARATE components — do NOT merge.*
*Chargily card payment is SIMULATED (setTimeout 2s) — replace with real Chargily API redirect for production.*
