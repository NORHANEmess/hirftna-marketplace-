# Hirftna Marketplace — Feature-to-Code Map
# QUICK REFERENCE FOR GRADUATION DEFENSE (SOUTENANCE)
#
# When the jury asks "show me where you implemented X",
# find the feature below → open the exact file → point to the code.

---

## HOW TO USE THIS FILE

1. Jury asks: "Show me your authentication code"
2. Find: **Feature: User Login**
3. Open: `backend/src/services/auth.service.js` → function `login()` (line ~293)
4. Also open: `frontend/src/pages/auth/LoginPage.jsx` → `handleCredentialSubmit()` (line ~30)
5. Explain the flow as documented below

---

## TABLE OF CONTENTS

- [AUTHENTICATION & USERS](#authentication--users)
- [PRODUCTS](#products)
- [CUSTOM ORDER SYSTEM](#custom-order-system)
- [PAYMENT](#payment)
- [RATINGS & REVIEWS](#ratings--reviews)
- [WISHLIST](#wishlist)
- [NOTIFICATIONS](#notifications)
- [SELLER FEATURES](#seller-features)
- [PROMOTION SYSTEM](#promotion-system)
- [ADMIN PANEL](#admin-panel)
- [AI CHATBOT](#ai-chatbot)
- [INTERNATIONALIZATION](#internationalization)
- [DESIGN SYSTEM](#design-system)
- [SECURITY](#security)
- [DEPLOYMENT](#deployment)

---

## AUTHENTICATION & USERS

---

### Feature: User Registration (with OTP email verification)

**What it does:** Creates a new user account. If AUTH_OTP_ENABLED=true, sends a 6-digit code to the user's email. The user must verify the code before they can log in.

**Backend:**
- `backend/src/services/auth.service.js` → function `register()` (line ~134)
  - Calls `supabasePublic.auth.signUp()` to create account in Supabase Auth
  - Waits up to 3×500ms for the DB trigger to create the `public.users` row
  - Updates `users` table with full_name, phone, role
  - If OTP enabled: calls `createOtpSession()` → returns `{ requires_otp: true, otp_token }`
- `backend/src/services/auth.service.js` → function `createOtpSession()` (line ~93)
  - Generates 6-digit code via `crypto.randomInt(100000, 1000000)` (CSPRNG)
  - Sends email via `nodemailer` SMTP
  - Stores SHA256 hash of code in `otp_sessions` table (never stores plaintext)
  - Returns UUID `otp_token` to the client
- `backend/src/controllers/auth.controller.js` → function `register()` (line ~1)
- `backend/src/routes/auth.routes.js` → `POST /register` (line ~1)
- `backend/src/validators/auth.validator.js` → `registerSchema` (line ~1)

**Frontend:**
- `frontend/src/pages/auth/RegisterPage.jsx` → component `RegisterPage` (line ~1)
  - Phase 1 state: `form = { full_name, email, password, confirm, role }`
  - Phase 2 state: `inOtpStep = Boolean(pendingOtp?.otp_token)` from AuthContext
  - `handleSubmit()` (line ~47) → calls `register(payload)` from AuthContext
  - If `requiresOtp: true` → page switches to OTP input UI
- `frontend/src/components/auth/OtpStep.jsx` → component `OtpStep` (line ~1)
  - 6 individual digit inputs, keyboard navigation, paste handler
  - `arriving` state for 2.8s animated "email arriving" phase
- `frontend/src/context/AuthContext.jsx` → function `register()` (line ~157)
- `frontend/src/services/api.js` → `authAPI.register()` (line ~343)

**Database tables:** `users`, `otp_sessions`, `auth.users` (Supabase internal)

**API endpoint:** `POST /api/v1/auth/register` — auth: none, rate-limited (authLimiter: 30/15min)

**To demo:** Go to `/register` → fill form (role: Client) → submit → check email inbox → enter 6-digit code → redirected to `/login` with green "Email verified!" banner

---

### Feature: User Login (JWT token generation)

**What it does:** Authenticates a user with email and password. Returns a JWT access token and refresh token.

**Backend:**
- `backend/src/services/auth.service.js` → function `login()` (line ~293)
  - Calls `supabasePublic.auth.signInWithPassword()`
  - Throws 403 if email not confirmed (`email_confirmed_at` is null)
  - Throws 401 for wrong password
  - Calls `selectUserProfile(userId)` to get application-level user data including `role` and `seller_id`
  - Returns `{ user, token: supabase_access_token, refresh_token }`
- `backend/src/controllers/auth.controller.js` → function `login()` (line ~20)
- `backend/src/routes/auth.routes.js` → `POST /login` (line ~20)

**Frontend:**
- `frontend/src/pages/auth/LoginPage.jsx` → `handleCredentialSubmit()` (line ~30)
  - Calls `login(email, password)` from `useAuth()`
  - On success: redirects based on role (admin → `/admin`, seller → `/seller/dashboard`, others → `from` path)
  - On 403: sets `emailNotVerified = true` → shows amber warning
- `frontend/src/context/AuthContext.jsx` → function `login()` (line ~114)
  - Calls `authAPI.login()`, receives payload
  - If success: calls `persistSession(payload)` → `storeSession()` → writes to localStorage
- `frontend/src/services/api.js` → `authAPI.login()` (line ~344)

**Storage keys set:** `hirftna_token`, `hirftna_refresh_token`, `hirftna_user` in localStorage

**Database tables:** `users`, `sellers` (to get seller_id)

**API endpoint:** `POST /api/v1/auth/login` — auth: none, rate-limited (authLimiter: 30/15min, skipSuccessfulRequests: true)

**To demo:** Go to `/login` → enter `norhane@hirftna.dz` / `Test1234` → logged in, redirected to home

---

### Feature: Token Refresh (automatic re-authentication)

**What it does:** When an access token expires (401 response), automatically uses the refresh token to get a new access token. The user never sees a login page unless the refresh token also expired.

**Frontend:**
- `frontend/src/services/api.js` → response interceptor (line ~297)
  - On 401 response: checks for `_retry` flag (prevents infinite loops)
  - Calls `refreshAccessToken()` → singleton promise (`refreshPromise`) prevents concurrent refreshes
  - `performRefresh()` (line ~260): calls `POST /auth/refresh` with stored `hirftna_refresh_token`
  - On success: stores new tokens, replays original request with new Authorization header
  - `flushFailedQueue()`: replays all requests that were queued during refresh
  - On failure: `clearStoredSession()` + redirect to `/login`
- `frontend/src/context/AuthContext.jsx` → bootstrap effect (line ~49)
  - On app load: calls `authAPI.getMe()` to validate existing token
  - On terminal error: calls `clearAuthState()`

**Backend:**
- `backend/src/services/auth.service.js` → function `refreshToken()` (line ~350)
  - Calls `supabasePublic.auth.refreshSession({ refresh_token })`
  - Returns new `{ user, token, refresh_token }` pair
- `backend/src/routes/auth.routes.js` → `POST /refresh` (line ~40)

**API endpoint:** `POST /api/v1/auth/refresh` — auth: none (refresh token in body)

**To demo:** Open DevTools → Application → localStorage → delete `hirftna_token` → make any API call → watch Network tab → see /auth/refresh request fire automatically before the original request retries

---

### Feature: OTP Verification (6-digit code)

**What it does:** Verifies the 6-digit code sent to the user's email during registration. Confirms the email address and activates the account.

**Backend:**
- `backend/src/services/auth.service.js` → function `verifyOtp()` (line ~388)
  - Deletes expired sessions first (cleanup)
  - Loads `otp_sessions` row by `otp_token` UUID
  - Checks `attempts < 5` (throws 429 if exceeded — anti-brute-force)
  - Hashes submitted code with SHA256: `Buffer.from(hashOtp(otp))`
  - **Timing-safe comparison:** `crypto.timingSafeEqual(incomingHash, storedHash)` — prevents timing oracle attacks
  - On match: deletes session (one-time use), calls `supabaseAdmin.auth.admin.updateUserById(userId, { email_confirm: true })`
  - Returns stored `{ user, token, refresh_token }`
- `backend/src/routes/auth.routes.js` → `POST /verify-otp`

**Frontend:**
- `frontend/src/components/auth/OtpStep.jsx` → full OTP input component
  - 6 inputs, auto-advance on digit entry, backspace to previous input, paste support
  - 2.8s "arriving" animation with envelope icon and bouncing dots
- `frontend/src/context/AuthContext.jsx` → function `verifyOtp()` (line ~140)
  - Calls `authAPI.verifyOtp({ otp_token, otp })`
  - Clears `pendingOtp` state on success

**Database tables:** `otp_sessions` (fetched and deleted), `auth.users` (email confirmed)

**API endpoint:** `POST /api/v1/auth/verify-otp` — auth: none

**To demo:** Register with a new email → check inbox → enter code in OTP step

---

### Feature: Forgot Password (email reset link)

**What it does:** Sends an email with a one-time password reset link. The email contains a 32-byte hex token with a 15-minute expiry.

**Backend:**
- `backend/src/services/auth.service.js` → function `forgotPassword()` (line ~570)
  - Deletes expired tokens from `password_reset_tokens` (cleanup)
  - Looks up user by email **silently** — if email not found, returns without error (prevents email enumeration)
  - Generates token: `crypto.randomBytes(32).toString('hex')` — 64 hex characters
  - Deletes any existing token for this user (one at a time per user)
  - Inserts `{ token, user_id, expires_at: now + 15min }` to `password_reset_tokens`
  - Sends email via SMTP: link = `${CLIENT_URL}/reset-password?token=${token}`
- `backend/src/routes/auth.routes.js` → `POST /forgot-password` with `forgotPasswordLimiter` (5 req/15min per IP)

**Frontend:**
- `frontend/src/pages/auth/ForgotPasswordPage.jsx` → component (line ~1)
  - Email input → `authAPI.forgotPassword(email)`
  - **Always shows success** regardless of result (security: don't reveal if email exists)
  - `catch` block is empty — failure is silently swallowed
- `frontend/src/services/api.js` → `authAPI.forgotPassword()` (line ~350)

**Database tables:** `password_reset_tokens`

**API endpoint:** `POST /api/v1/auth/forgot-password` — auth: none, rate-limited 5/15min

**To demo:** Go to `/forgot-password` → enter email → see "Check your inbox" success state

---

### Feature: Reset Password (token-based)

**What it does:** Uses the token from the email link to set a new password. Token is deleted immediately after use (single-use only).

**Backend:**
- `backend/src/services/auth.service.js` → function `resetPassword()` (line ~616)
  - Deletes expired tokens (cleanup)
  - Fetches token from `password_reset_tokens`
  - **Deletes token immediately** before attempting password update (prevents race condition)
  - Updates password via `supabaseAdmin.auth.admin.updateUserById(entry.user_id, { password: new_password })`

**Frontend:**
- `frontend/src/pages/auth/ResetPasswordPage.jsx` → component (line ~1)
  - Reads `?token=` from URL params — shows error if missing
  - Password + confirm inputs with strength meter
  - `authAPI.resetPassword(token, new_password)`
  - On success: shows success state + auto-redirects to `/login` after 3 seconds

**Database tables:** `password_reset_tokens` (fetched then deleted), `auth.users` (password updated)

**API endpoint:** `POST /api/v1/auth/reset-password` — auth: none

**To demo:** Use the link from the forgot-password email → enter new password → confirm

---

### Feature: Logout

**What it does:** Invalidates the user's session on the backend and clears all tokens from localStorage.

**Backend:**
- `backend/src/services/auth.service.js` → function `logout()` (line ~449)
  - Calls `supabaseAdmin.auth.admin.signOut(userId)` — invalidates all sessions for this user
  - Non-fatal: errors are only logged (session may already be expired)

**Frontend:**
- `frontend/src/context/AuthContext.jsx` → function `logout()` (line ~183)
  - Calls `authAPI.logout()`
  - Calls `clearAuthState()` regardless of API result (local cleanup always happens)
  - `loading` state set during operation

**API endpoint:** `POST /api/v1/auth/logout` — auth: required

**To demo:** Click Profile → Sign Out (DesktopNav dropdown) or hamburger menu on mobile

---

### Feature: Profile View & Edit

**What it does:** Shows the authenticated user's profile and allows editing name, phone, and avatar.

**Backend:**
- `backend/src/services/auth.service.js` → `getMe()` (line ~466), `updateProfile()` (line ~476)
- `backend/src/routes/auth.routes.js` → `GET /me`, `PUT /me`

**Frontend:**
- `frontend/src/pages/client/ProfilePage.jsx` → component (line ~1)
  - `form = { full_name, phone, avatar_url }` — initialized from `user` in AuthContext
  - `handleSaveProfile()` (line ~223): calls `authAPI.updateMe(payload)` then `updateUser(updatedUser)` to sync AuthContext
  - Avatar uploader: calls `uploadsAPI.uploadImage(file)` on file select → updates `form.avatar_url`
  - Seller section (if `isSeller`): additional shop fields, calls `sellersAPI.getMe()` on mount

**API endpoints:** `GET /api/v1/auth/me`, `PUT /api/v1/auth/me` — auth: required

**To demo:** Go to `/profile` → change name → Save

---

### Feature: Role-based Access Control

**What it does:** Prevents users from accessing routes that don't match their role (client can't access seller dashboard, non-admin can't access admin panel, etc.).

**Backend:**
- `backend/src/middlewares/role.middleware.js` → function `requireRole(...roles)` (line ~33)
  - At module load: validates role names against `VALID_ROLES` — crashes if typo
  - Returns middleware: checks `req.user.role` against allowed list → 403 if mismatch
- Usage example: `router.post('/', authenticate, requireRole('seller'), createProduct)`

**Frontend:**
- `frontend/src/router/index.jsx` → route guard components (lines ~67-169):
  - `RequireAuth` (line ~67): any authenticated user
  - `RequireSeller` (line ~90): role=seller only; admin → /admin; client → /
  - `RequireNotAdmin` (line ~117): blocks admins from client pages
  - `GuestOnly` (line ~141): only unauthenticated; logged-in → /
  - `RequireAdmin` (line ~154): role=admin only

**To demo:** While logged in as a client, try navigating to `/seller/dashboard` in the URL bar → redirected to `/`

---

## PRODUCTS

---

### Feature: Create Product (seller)

**What it does:** Allows a seller to create a new product listing with a price range, description, images, and category.

**Backend:**
- `backend/src/services/product.service.js` → function `createProduct()` (line ~455)
  - Resolves seller via `getSellerByUserId(userId)`
  - Inserts to `products` table
  - Inserts to `product_images` (position 0 = cover, position 1+ = gallery)
  - On `product_images` insert failure: deletes product (rollback)
  - Fires `updateVerificationStatus(seller.id)` fire-and-forget
- `backend/src/controllers/product.controller.js` → `createProduct()` (line ~1)
- `backend/src/routes/product.routes.js` → `POST /` (auth: seller)
- `backend/src/validators/product.validator.js` → `createProductSchema`

**Frontend:**
- `frontend/src/pages/seller/SellerProducts.jsx` → `ProductFormModal` sub-component (line ~136)
  - Fields: name, description, category, price_min, price_max, completion_days, images
  - Image upload: `uploadsAPI.uploadImages(files)` → returns array of URLs
  - `handleSaved()` (line ~518): closes modal, refreshes product list
- `frontend/src/services/api.js` → `productsAPI.create()` (line ~358)

**Database tables:** `products`, `product_images`

**API endpoint:** `POST /api/v1/products` — auth: required, role: seller

**To demo:** Login as seller → `/seller/products` → click "Add Product" → fill form → upload images → Save

---

### Feature: Browse Products (with filters, sorting, pagination)

**What it does:** Returns a paginated list of products with optional filters: search (full-text), category, price range, sort order.

**Backend:**
- `backend/src/services/product.service.js` → function `getAllProducts()` (line ~354)
  - Builds Supabase query: `is_active = true` always applied
  - Search: `.ilike('name', '%term%')` on `name` column
  - Category: `.eq('category_id', id)` after slug→ID resolution
  - Price: `.gte('price_min', min)` and `.lte('price_max', max)`
  - Sort: maps to `{ column, ascending }` via `getSortOrder()`
  - Returns paginated results with hydrated seller, images, category
- `backend/src/validators/product.validator.js` → `productQuerySchema`

**Frontend:**
- `frontend/src/pages/BrowsePage.jsx` → `fetchProducts()` callback (line ~180)
  - Filters synced to URL params (survives browser refresh)
  - Category pills, sort dropdown, price range inputs, search input
  - "Load More" pagination (appends to existing results)
  - Promoted sellers strip from `promotionsAPI.getBrowseAds()`

**API endpoint:** `GET /api/v1/products?search=X&category_id=Y&sort=Z&page=1&limit=20` — auth: optional

**To demo:** Go to `/browse` → type in search bar → see results update

---

### Feature: Product Detail Page (gallery, tabs, seller info)

**What it does:** Shows a single product with image gallery, description, reviews tab, seller info tab, price range, and the "Request Custom Order" CTA.

**Backend:**
- `backend/src/services/product.service.js` → `getProductById()` (line ~444)
  - Increments `view_count` fire-and-forget
  - Logs `browsing_events` if user is authenticated

**Frontend:**
- `frontend/src/pages/ProductPage.jsx` → component (line ~1)
  - `ImageGallery` sub-component with thumbnails and arrows
  - 3 tabs: Details, Reviews, Seller
  - Wishlist toggle (optimistic)
  - "Request Custom Order" button → fires `window.dispatchEvent(new CustomEvent('open-order-form', { detail: { product } }))`

**API endpoint:** `GET /api/v1/products/:id` — auth: optional

**To demo:** Click any product on home page or browse page

---

### Feature: Delete Product (seller, with related records cleanup)

**What it does:** Deletes a product and all related records: images, wishlist entries, reviews, order items, promotion records, browsing events.

**Backend:**
- `backend/src/services/product.service.js` → function `deleteProduct()` (line ~615)
  - Verifies ownership: `product.seller_id !== seller.id` → 403
  - Parallel cleanup: `browsing_events`, `reviews`, `wishlist`, `product_images`, `promotions`, `order_items`
  - Then deletes `products` row
- **Admin version:** `backend/src/services/admin.service.js` → `deleteProduct()` (line ~348)
  - Same parallel cleanup, no ownership check needed

**Frontend:**
- `frontend/src/pages/seller/SellerProducts.jsx` → `handleDelete()` → opens `DeleteModal`
  - After confirm: calls `productsAPI.delete(id)` → removes from local state

**API endpoints:**
- `DELETE /api/v1/products/:id` — auth: required, role: seller (own products only)
- `DELETE /api/v1/admin/products/:id` — auth: required, role: admin (any product)

**To demo:** Seller → `/seller/products` → click trash icon → confirm delete

---

### Feature: Upload Product Images

**What it does:** Uploads up to 5 product images to Supabase Storage. Validates MIME type with magic bytes, processes with Sharp, returns public URLs.

**Backend:**
- `backend/src/services/upload.service.js` → `uploadImage()` (line ~167), `uploadMultipleImages()` (line ~283)
  - `validateFile()`: checks extension + magic bytes (JPEG=FFD8FF, PNG=89504E47, WebP=52494646+WEBP)
  - `processImage()`: auto-rotate, compress (JPEG 85%, PNG level 8, WebP 85%) via Sharp
  - Tries candidate buckets: `['product-images', 'products', 'uploads', 'avatars']`
  - File path: `products/{userId}/{timestamp}-{uuid}{ext}`
  - Returns public Supabase Storage URL
- `backend/src/routes/upload.routes.js` → `POST /images` with multer (5 files max, 5MB each)
  - Per-user rate limit: 20 uploads / 15 min (keyed by `req.user.id`)

**Frontend:**
- `frontend/src/pages/seller/SellerProducts.jsx` → `ImageUploader` sub-component
  - File input → `uploadsAPI.uploadImages(files)` → stores returned URLs
- `frontend/src/services/api.js` → `uploadsAPI.uploadImages()` (line ~474)
  - Creates `FormData`, appends files under `'images'` field name
  - Sets `Content-Type: multipart/form-data`

**API endpoint:** `POST /api/v1/uploads/images` — auth: required, rate-limited per user

**To demo:** Seller → Add Product → click image upload area → select files

---

## CUSTOM ORDER SYSTEM

---

### Feature: Request Custom Order (3-step form)

**What it does:** The core feature. Client submits a custom order request with requirements, budget range, deadline, reference images, and contact info.

**Backend:**
- `backend/src/services/order.service.js` → function `createOrder()` (line ~148)
  - `validateOrderItems()`: verifies products exist, are active, belong to same seller
  - Inserts `orders` row: `client_id, seller_id, status='pending', total_amount (reference), budget_min, budget_max, deadline, reference_images, notes, delivery_type, payment_method, client_name, client_phone, client_address, is_custom=true`
  - Inserts `order_items` row(s)
  - Sends `new_order` notification to seller: `meta: { orderId, clientName }`
- `backend/src/validators/order.validator.js` → `createOrderSchema` (via shared schema)
- `backend/src/routes/order.routes.js` → `POST /` (auth: any authenticated)

**Frontend:**
- `frontend/src/components/order/CustomOrderForm.jsx` → component (line ~1)
  - **Mounted globally in RootLayout** — listens for `window.addEventListener('open-order-form')`
  - Fired from: `ProductPage` and `ProductCard` → `window.dispatchEvent(new CustomEvent('open-order-form', { detail: { product } }))`
  - Step 0: requirements textarea (500 char max), budget_min/max, deadline, reference_images (3 max)
  - Step 1: delivery_type (hand_to_hand/office_pickup/fast), payment_method (cash/card)
  - Step 2: client_name, client_phone, client_address (pre-filled from user profile)
  - `handleSubmit()`: `ordersAPI.create(payload)` → shows `SuccessState`
- `frontend/src/services/api.js` → `ordersAPI.create()` (line ~364)

**Database tables:** `orders`, `order_items`, `notifications`

**API endpoint:** `POST /api/v1/orders` — auth: required, role: any

**To demo:** Browse products → click any product → click "Request Custom Order" → fill 3-step form → Submit

---

### Feature: Accept Order (seller)

**What it does:** Seller accepts a pending order. Status changes from `pending` to `accepted`. Client receives a notification.

**Backend:**
- `backend/src/services/order.service.js` → function `updateOrderStatus()` (line ~371)
  - Verifies seller owns the order: `order.seller_id !== seller.id` → 403
  - Enforces state machine: `VALID_TRANSITIONS.pending = ['accepted', 'rejected']`
  - Updates `orders.status = 'accepted'`
  - Sends `order_accepted` notification to client: `meta: { orderId, shopName }`
- `backend/src/routes/order.routes.js` → `PATCH /:id/status` (auth: required, role: seller)

**Frontend:**
- `frontend/src/components/order/OrderCard.jsx` → accept button (line ~412)
  - `viewAs='seller'` + `status=pending` → shows "Accept" and "Reject" buttons
  - Click "Accept" → `ordersAPI.updateStatus(orderId, { status: 'accepted' })`
  - Calls `onUpdated(updatedOrder)` callback
- `frontend/src/pages/seller/SellerOrdersPage.jsx` → "Incoming Orders" tab

**API endpoint:** `PATCH /api/v1/orders/:id/status` — auth: required, role: seller

**To demo:** Login as seller → `/seller/orders` → find pending order → click "Accept"

---

### Feature: Reject Order (seller, with reason)

**What it does:** Seller rejects a pending order with a required rejection reason. Status becomes `rejected` (terminal).

**Backend:**
- `backend/src/services/order.service.js` → function `updateOrderStatus()` (line ~371)
  - `status='rejected'` + `rejection_reason` stored in `orders.rejection_reason` column
  - Sends `order_rejected` notification with `meta: { rejectionReason }` to client

**Frontend:**
- `frontend/src/components/order/OrderCard.jsx` → reject flow (line ~412)
  - "Reject" button → reveals textarea for reason + "Confirm Rejection" button
  - Requires non-empty reason (client-side validation)
  - `ordersAPI.updateStatus(orderId, { status: 'rejected', rejection_reason: reason })`

**API endpoint:** `PATCH /api/v1/orders/:id/status` — same endpoint as accept, different payload

**To demo:** Seller orders page → click "Reject" → enter reason → Confirm

---

### Feature: Mark Order as Ready (seller sets final price)

**What it does:** Seller marks the order as ready for delivery and sets the final price. Status changes from `accepted` to `ready`.

**Backend:**
- `backend/src/services/order.service.js` → function `markReady()` (line ~464)
  - Verifies `order.status === 'accepted'` (not pending, not rejected)
  - Updates: `status='ready'`, `final_price`, `ready_at=now()`, optionally `delivery_type`
  - Sends `order_ready` notification to client: `meta: { finalPrice, shopName }`
- `backend/src/routes/order.routes.js` → `PATCH /:id/ready` (auth: required, role: seller)
- `backend/src/validators/order.validator.js` → `markReadySchema` (final_price required positive number)

**Frontend:**
- `frontend/src/components/order/OrderCard.jsx` → "Mark as Ready" section (line ~412)
  - `viewAs='seller'` + `status=accepted` → shows inline form
  - `final_price` input + `delivery_type` selector
  - `ordersAPI.markReady(orderId, { final_price, delivery_type })`

**API endpoint:** `PATCH /api/v1/orders/:id/ready` — auth: required, role: seller

**To demo:** Seller accepts order → open accepted order → click "Mark as Ready" → enter final price → Submit

---

### Feature: Confirm Order Complete (client)

**What it does:** Client confirms receipt of the product and finalizes the order. Status changes from `ready` to `completed`.

**Backend:**
- `backend/src/services/order.service.js` → function `confirmComplete()` (line ~537)
  - Verifies `order.client_id === userId` — ONLY the client who placed the order can confirm (seller cannot)
  - Verifies `order.status === 'ready'`
  - Updates: `status='completed'`, `completed_at=now()`
  - Sends `order_completed` notification to seller
  - Fire-and-forget: `updateVerificationStatus(order.seller_id)` — may auto-grant verified badge
- `backend/src/routes/order.routes.js` → `PATCH /:id/complete` (auth: required, role: client)

**Frontend:**
- `frontend/src/components/order/OrderCard.jsx` → "Confirm Complete" button (line ~412)
  - `viewAs='client'` + `status=ready` → shows the button + final price display
  - Clicking "Confirm Complete" opens `PaymentStep` modal instead of calling API directly
- `frontend/src/components/order/PaymentStep.jsx` → modal (line ~1)
  - Cash: confirm checkbox → calls `ordersAPI.confirmComplete(orderId)`
  - Card: simulated 2s → calls `ordersAPI.confirmComplete(orderId)` automatically

**API endpoint:** `PATCH /api/v1/orders/:id/complete` — auth: required, role: client

**To demo:** Client → `/orders` → find READY order → click "Confirm Complete" → confirm payment → completed

---

### Feature: Order Status Tracking

**What it does:** Users can see the current status of all their orders with color-coded badges.

**Frontend:**
- `frontend/src/components/order/OrderStatusBadge.jsx` — status badge component
  - Actually implemented in `frontend/src/components/ui/Badge.jsx` → `OrderStatusBadge` export (line ~48)
  - Also in `frontend/src/components/order/OrderCard.jsx` → `StatusBadge` sub-component (line ~39)
  - Maps: `pending→warning`, `accepted→sage`, `rejected→danger`, `ready→info`, `completed→success`
- `frontend/src/pages/client/OrdersPage.jsx` → status filter tabs
  - Counts per status shown in tabs
  - `actionCount`: orders with `pending || ready` status → urgency indicator in header

**To demo:** `/orders` → see all status badges → click tab filters

---

## PAYMENT

---

### Feature: Client Payment — Cash on Delivery

**What it does:** When the order is READY and payment method is cash, the client confirms they received the product and paid.

**Frontend:**
- `frontend/src/components/order/PaymentStep.jsx` → cash flow (line ~49)
  - Shows "Cash on Delivery" info card with instructions
  - Checkbox: "I confirm I received the product and paid [final_price] DA"
  - Button: "Yes, I Received & Paid" → calls `onComplete()` which calls `ordersAPI.confirmComplete(orderId)`
  - No backend payment API — cash is confirmed by mutual trust
- Opened from: `frontend/src/components/order/OrderCard.jsx` → `showPayment` state

**To demo:** Client finds READY order with cash payment → click "Confirm Complete" → check box → confirm

---

### Feature: Client Payment — Card via Chargily (simulated)

**What it does:** Simulates a Chargily (Algerian payment gateway) card payment flow. In MVP, uses setTimeout(2s) instead of real API call.

**Frontend:**
- `frontend/src/components/order/PaymentStep.jsx` → card flow (line ~66)
  - "Card Payment" tab with payment icon
  - "Pay Now" button → sets `processing=true` → `setTimeout(2000)` → `success=true` → `setTimeout(1500)` → calls `onComplete()`
  - `CONTEXT.md` note: "Chargily card payment is SIMULATED — replace with real Chargily API for production"

**To demo:** Create order with `payment_method: 'card'` → mark ready → client confirms → see spinner then success animation

---

### Feature: Seller Payment — Activation/Promotion Fee (CCP transfer)

**What it does:** Shows the seller payment instructions (CCP/BaridiMob bank transfer) for platform fees. Seller declares payment; admin manually verifies.

**Frontend:**
- `frontend/src/components/payment/PaymentModal.jsx` → component (line ~1)
  - `amount` prop: the amount to pay in DA
  - `description` prop: label (e.g., "Promotion Fee — Hero Placement")
  - Shows CCP account number (from i18n key `payment.ccp_account`) with copy-to-clipboard
  - "I've Completed the Transfer" button → 600ms spinner → `onPaymentDeclared()` callback
  - No backend API call — purely informational declaration
- Opened from: `frontend/src/pages/seller/SellerPromotions.jsx` after `promotionsAPI.request()` success

**To demo:** Seller → `/seller/promotions` → request promotion → see PaymentModal with CCP details

---

## RATINGS & REVIEWS

---

### Feature: Client Reviews Seller (after order completion)

**What it does:** After an order is completed, the client can rate the seller (1-5 stars). This updates `sellers.avg_rating` via the `trg_seller_avg_rating` database trigger.

**Backend:**
- `backend/src/services/review.service.js` → function `createSellerRating()` (line ~227)
  - Verifies order exists, belongs to client, and `status === 'completed'`
  - Derives `seller_id` from order (not from request — prevents injection)
  - Checks for duplicate: `(order_id, client_id)` unique
  - Inserts to `ratings` table
  - Fires `updateVerificationStatus(seller_id)` in background (may affect avg_rating threshold)
- `backend/src/routes/review.routes.js` → `POST /seller` (auth: required, role: client)

**Frontend:**
- `frontend/src/components/order/OrderCard.jsx` → "Rate Seller" section (line ~608)
  - `viewAs='client'` + `status=completed` + `!sellerRated` → shows "Rate Seller" button
  - Opens `ReviewSellerModal`
- `frontend/src/components/order/ReviewSellerModal.jsx` → component (line ~1)
  - Star picker + submit
  - Calls `reviewsAPI.createRating({ order_id, rating })`

**Database tables:** `ratings` (trigger updates `sellers.avg_rating`)

**API endpoint:** `POST /api/v1/reviews/seller` — auth: required, role: client

**To demo:** Client completes an order → finds it in `/orders` → clicks "Rate Seller"

---

### Feature: Seller Rates Client (after order completion)

**What it does:** After an order is completed, the seller can rate the client (1-5 stars with optional comment).

**Backend:**
- `backend/src/services/clientRating.service.js` → function `createClientRating()` (line ~15)
  - Resolves seller from `sellers` table using `userId`
  - Verifies order belongs to this seller and `status === 'completed'`
  - DB UNIQUE constraint on `(order_id, seller_id)` prevents duplicate
  - Inserts to `client_ratings` table
- `backend/src/routes/clientRating.routes.js` → `POST /` (auth: required, role: seller)

**Frontend:**
- `frontend/src/components/order/OrderCard.jsx` → "Rate Client" section
  - `viewAs='seller'` + `status=completed` → shows "Rate Client" button
  - Opens `RateClientModal`
- `frontend/src/components/order/RateClientModal.jsx` → component (line ~1)
  - `StarPicker` sub-component (interactive, hover states)
  - Rating labels: `{ 1: {en,ar}, ..., 5: {en,ar} }` for "Poor" through "Excellent"
  - Calls `clientRatingsAPI.create({ order_id, client_id, rating, comment })`
- `frontend/src/pages/seller/SellerOrdersPage.jsx` → also has "Rate Client" button on completed orders (line ~129)

**Database tables:** `client_ratings`

**API endpoint:** `POST /api/v1/client-ratings` — auth: required, role: seller

**To demo:** Seller → `/seller/orders` → find completed order → "Rate Client"

---

### Feature: Star Rating Display & Average Calculation

**What it does:** Displays product and seller average ratings. Averages are auto-calculated by database triggers.

**Backend triggers:**
- `trg_product_avg_rating` — fires after INSERT/UPDATE/DELETE on `reviews` → updates `products.avg_rating`
- `trg_seller_avg_rating` — fires after INSERT/UPDATE/DELETE on `ratings` → updates `sellers.avg_rating`
- Both use `AVG(rating)` recalculation

**Frontend:**
- `frontend/src/components/ui/StarRating.jsx` → component (line ~1)
  - `StarRating` (display): renders 5 stars filled based on `Math.round(rating)`, shows numeric value and review count
  - `InteractiveStarRating` (input): click to rate, hover preview

**To demo:** View any product → see star rating below product name

---

## WISHLIST

---

### Feature: Add/Remove Product from Wishlist

**What it does:** Users (both clients and sellers) can save products to a personal wishlist. UNIQUE constraint prevents duplicates.

**Backend:**
- `backend/src/services/wishlist.service.js` → `addToWishlist()` (line ~47), `removeFromWishlist()` (line ~137)
  - `addToWishlist`: verifies product active, checks duplicate (maybeSingle), inserts, records browsing event
  - `removeFromWishlist`: finds by `(user_id, product_id)`, deletes by row ID
- `backend/src/routes/wishlist.routes.js` → `POST /`, `DELETE /:product_id`

**Frontend:**
- `frontend/src/components/product/ProductCard.jsx` → heart button (line ~1)
  - **Optimistic update**: toggles `wishlisted` state BEFORE API call — reverts on error
  - `heartPulse` state: fires `animate-heart-beat` CSS class for 350ms
  - `wishlistAPI.add(productId)` or `wishlistAPI.remove(productId)`
  - Redirects unauthenticated users to `/login`
- `frontend/src/pages/client/WishlistPage.jsx` → `handleWishlistToggle()` (line ~59)
  - When product is un-hearted in wishlist page → removes from local `items` array instantly (no re-fetch)

**Database tables:** `wishlist` (UNIQUE on user_id + product_id), `browsing_events`

**API endpoints:** `POST /api/v1/wishlist`, `DELETE /api/v1/wishlist/:product_id` — auth: required

**To demo:** Go to any product card → click the heart → it turns red

---

### Feature: Wishlist Page Display

**What it does:** Shows all products the user has saved to their wishlist.

**Frontend:**
- `frontend/src/pages/client/WishlistPage.jsx` → component (line ~1)
  - Calls `wishlistAPI.getAll()` → maps `entry.product` to get product objects
  - Each `ProductCard` has `wishlisted={true}` and `onWishlistToggle` handler
  - On load failure: shows error toast

**API endpoint:** `GET /api/v1/wishlist` — auth: required

**To demo:** Heart some products → navigate to `/wishlist`

---

## NOTIFICATIONS

---

### Feature: Notification Creation (backend, per event type)

**What it does:** Creates notification records in the database when key events happen. These are then polled/fetched by the frontend.

**Backend:**
- `backend/src/services/order.service.js` → `createNotification()` helper (line ~57)
  - Fire-and-forget: `supabaseAdmin.from('notifications').insert({ user_id, type, title, body, meta })`
  - Called at each order status transition
  - `type` field = i18n key (e.g., `'new_order'`, `'order_accepted'`)
  - `meta` field = JSONB with dynamic values for translation: `{ clientName, shopName, finalPrice, rejectionReason }`
- `backend/src/services/admin.service.js` → `verifySeller()` sends `seller_verified` notification
- `backend/src/services/promotion.service.js` (admin activate/reject) → `promotion_activated`, `promotion_rejected`

**Database tables:** `notifications`

---

### Feature: Notification Unread Count (polling)

**What it does:** Frontend polls every 120 seconds to update the notification badge count.

**Backend:**
- `backend/src/services/notification.service.js` → `getUnreadCount()` (line ~44)
  - Uses `{ count: 'exact', head: true }` — no rows returned, just the count (very fast query)
  - Returns integer count of unread notifications for `userId`
- `backend/src/routes/notification.routes.js` → `GET /unread-count`

**Frontend:**
- `frontend/src/components/layout/MainLayout.jsx` → polling effect (line ~12)
  - `setInterval` every 120 seconds (2 minutes)
  - Pauses when `document.hidden === true` (tab not visible)
  - On 401: calls `clearSession()` (handles expired tokens during polling)
  - Updates `unreadCount` state → passed to `TopBar` and `BottomNav`

**API endpoint:** `GET /api/v1/notifications/unread-count` — auth: required

---

### Feature: Notification Display (with type-based i18n translation)

**What it does:** Shows notifications to users with translated messages. Dynamic values from the `meta` field are interpolated into the translation string.

**Frontend:**
- `frontend/src/pages/NotificationsPage.jsx` → component (line ~1)
  - `TYPE_CONFIG` (line ~11): maps type → icon and color
  - Split into "New" (unread) and "Earlier" (read) sections
  - Uses `getNotificationText(notification, t)` for display text
- `frontend/src/utils/notificationText.js` → `getNotificationText()` (line ~1)
  - Known types → `t('notifications.<type>.title', notification.meta)` (meta used as interpolation vars)
  - Example: `t('notifications.new_order.title', { clientName: 'Ahmed' })` → "New order from Ahmed"
  - Unknown types → raw `title`/`body` fields from DB

**i18n keys used:**
```
notifications.new_order.title: "New order from {{clientName}}"
notifications.order_accepted.title: "{{shopName}} accepted your order"
notifications.order_rejected.title: "{{shopName}} rejected your order"
notifications.order_ready.title: "Your order is ready! Final price: {{finalPrice}} DA"
notifications.order_completed.title: "{{clientName}} confirmed the order"
```

**To demo:** Trigger order acceptance → check notification page → see translated message with shop name

---

### Feature: Mark Notifications as Read

**What it does:** Marks individual or all notifications as read. Uses optimistic updates.

**Backend:**
- `backend/src/services/notification.service.js` → `markAsRead()` (line ~66), `markAllAsRead()` (line ~112)
  - `markAsRead`: ownership check (`notification.user_id !== userId` → 403) then updates `is_read=true`
  - `markAllAsRead`: `.eq('is_read', false)` on all user's notifications

**Frontend:**
- `frontend/src/pages/NotificationsPage.jsx` → `handleMarkRead()` (line ~93), `handleMarkAll()` (line ~109)
  - Both use **optimistic updates**: update local state first, then call API
  - On failure: `handleMarkAll` re-fetches from server to restore correct state

**API endpoints:** `PATCH /api/v1/notifications/:id/read`, `PATCH /api/v1/notifications/mark-all-read` — auth: required

---

## SELLER FEATURES

---

### Feature: Create Seller Profile / Shop

**What it does:** Converts a client user into a seller (or creates the seller profile for an account registered as seller).

**Backend:**
- `backend/src/services/seller.service.js` → function `createSeller()` (line ~221)
  - Verifies no existing seller profile for this user
  - Verifies `users.role === 'seller'`
  - Inserts to `sellers` with `is_verified=false`
  - Fires `updateVerificationStatus` in background (checks if new seller meets criteria)
- `backend/src/routes/seller.routes.js` → `POST /` (auth: required, role: seller)

**Frontend:**
- `frontend/src/pages/seller/SellerProfileEdit.jsx` → `handleSave()` (line ~250)
  - If `sellerId === null`: calls `sellersAPI.create(form)` (creates new)
  - Otherwise: calls `sellersAPI.update(sellerId, form)` (updates existing)
  - After creation: stores new `sellerId` from response

---

### Feature: Seller Dashboard (stats, quick actions)

**What it does:** Central hub for sellers showing analytics, pending orders count, and quick links.

**Backend:**
- `backend/src/services/seller.service.js` → `getSellerAnalytics()` (line ~480)
  - Parallel HEAD queries: total products, active products, total orders, pending orders
  - Top 5 products by view_count

**Frontend:**
- `frontend/src/pages/seller/SellerDashboard.jsx` → component (line ~1)
  - Stats grid: Sales, Revenue (from `analytics.orders.completed_amount`), Views, Rating
  - Verification card: criteria checklist with `VerificationCriterion` sub-component
  - "Boost Your Shop" link → `/seller/promotions`
  - Recent orders: `ordersAPI.getAll({ limit: 5 })`

**API endpoint:** `GET /api/v1/sellers/analytics` — auth: required, role: seller

**To demo:** Login as seller → `/seller/dashboard`

---

### Feature: Verification Badge (earned, not gating)

**What it does:** Admin can grant a verified badge to trusted sellers. The badge is a trust indicator only — it does NOT gate product visibility or sales.

**Backend:**
- `backend/src/services/admin.service.js` → `verifySeller()` (line ~302)
  - Sets `sellers.is_verified = isVerified` AND `sellers.admin_override = isVerified`
  - `admin_override` prevents `updateVerificationStatus()` from auto-reverting
- `backend/src/services/verification.service.js` → `updateVerificationStatus()` (line ~94)
  - Auto-verifies when: ≥1 active product + ≥3 completed orders + avg_rating ≥4.0 + complete profile
  - Skips if `admin_override` is not null

**Frontend:**
- `frontend/src/components/ui/VerifiedBadge.jsx` → small "Verified" badge with sage checkmark
- `frontend/src/pages/seller/SellerDashboard.jsx` → earn-badge info card
  - "All sellers can sell without being verified — verification is a trust badge"

**API endpoint:** `PATCH /api/v1/admin/sellers/:id/verify` — auth: required, role: admin

**To demo:** Admin → `/admin/users` → find seller → click "Verify" → green badge appears on their shop

---

## PROMOTION SYSTEM

---

### Feature: Request Promotion (with duration selector)

**What it does:** Seller submits a promotion request for a specific placement (hero/browse) and duration (7/14/30 days). Admin reviews and activates.

**Backend:**
- `backend/src/services/promotion.service.js` → `requestPromotion()` (line ~13)
  - Checks no existing active/pending promotion for same scope (throws 409)
  - Inserts: `{ seller_id, placement, requested_days, status='pending', is_active=false }`
- `backend/src/routes/promotion.routes.js` → `POST /request` (auth: required, role: seller)

**Frontend:**
- `frontend/src/pages/seller/SellerPromotions.jsx` → `handleRequest()` (line ~214)
  - Duration selector: 7/14/30 days × 500 DA/day
  - Price calculated: `selectedDays * 500 DA`
  - After success: opens `PaymentModal` with the calculated amount

**API endpoint:** `POST /api/v1/promotions/request` — auth: required, role: seller

**To demo:** Seller → `/seller/promotions` → select Hero placement + 14 days → Request

---

### Feature: Promotion Countdown (days remaining, progress bar)

**What it does:** Shows the seller how many days remain in their active promotion with a countdown and visual progress bar.

**Frontend:**
- `frontend/src/pages/seller/SellerPromotions.jsx` → `ActivePromotionCard` sub-component (line ~110)
  - Computes elapsed: `(now - starts_at) / (ends_at - starts_at) * 100`
  - Color-codes countdown: amber warning when ≤ 2 days remaining
  - Progress bar: CSS width based on elapsed%

**To demo:** After a promotion is activated by admin → seller visits `/seller/promotions`

---

### Feature: Promotion on Homepage Hero (carousel of promoted sellers)

**What it does:** When sellers have active hero promotions, the homepage shows their shops in a carousel instead of the static hero image.

**Backend:**
- `backend/src/services/promotion.service.js` → `getHeroAds()` (line ~123)
  - Filter: `placement='hero', status='active', is_active=true, ends_at > NOW()`
  - Join: seller info + category
  - Returns up to 6 promotions
- `backend/src/routes/promotion.routes.js` → `GET /hero` (public)

**Frontend:**
- `frontend/src/pages/HomePage.jsx` → `heroAds` state (line ~688)
  - If `heroAds === null` (loading) or `heroAds.length > 0` → shows `HeroCarousel`
  - If `heroAds.length === 0` → shows static `HeroSection` with artisan fallback
- `frontend/src/components/hero/HeroCarousel.jsx` → component (line ~1)
  - Auto-advances every 5s; touch swipe; respects `prefers-reduced-motion`
  - Ken-Burns animation on active slide image

**API endpoint:** `GET /api/v1/promotions/hero` — auth: none (public)

**To demo:** When admin has activated a hero promotion → visit homepage → see carousel

---

### Feature: Admin Approve/Reject Promotion

**What it does:** Admin reviews pending promotions and activates or rejects them with a reason.

**Backend:**
- `backend/src/services/admin.service.js` → `activatePromotion()` (line ~496), `rejectPromotion()` (line ~548)
  - `activatePromotion`: sets `status='active', is_active=true, starts_at=now, ends_at=now+requested_days`; sends `promotion_activated` notification
  - `rejectPromotion`: sets `status='rejected', is_active=false, rejection_reason`; sends `promotion_rejected` notification

**Frontend:**
- `frontend/src/pages/admin/AdminPromotions.jsx` → component (line ~1)
  - "Activate" button: `adminAPI.activatePromotion(id)` → refetches
  - "Reject" button: opens `RejectModal` with textarea → `adminAPI.rejectPromotion(id, reason)`
  - Status tabs: All / Pending / Active / Expired

**API endpoints:** `PATCH /api/v1/admin/promotions/:id/activate`, `PATCH /api/v1/admin/promotions/:id/reject` — auth: required, role: admin

**To demo:** Admin → `/admin/promotions` → find pending request → click "Activate"

---

## ADMIN PANEL

---

### Feature: Admin Dashboard (stats, charts)

**What it does:** Shows platform-wide statistics: users by role, products, orders by status, revenue, top sellers and products.

**Backend:**
- `backend/src/services/admin.service.js` → `getStats()` (line ~143)
  - **16 parallel queries** via `Promise.all()`: user counts, product counts, order counts by each status, revenue sum, review count, new users/orders this month, top sellers, top products
  - Revenue = `SUM(final_price)` on completed orders

**Frontend:**
- `frontend/src/pages/admin/AdminDashboard.jsx` → component (line ~1)
  - `StatusBar` sub-component: proportional fill bars for order status breakdown
  - Top Sellers / Top Products leaderboards

**API endpoint:** `GET /api/v1/admin/stats` — auth: required, role: admin

**To demo:** Login as admin → `/admin`

---

### Feature: User Management (list, filter, verify)

**What it does:** Admin can view all users, filter by role, search by name/email, see per-user stats, verify/revoke sellers, change roles.

**Backend:**
- `backend/src/services/admin.service.js` → `getUsers()` (line ~14)
  - Pre-filter by verification status (sellers only)
  - Batch enrichment: 4 parallel queries for product counts, order counts, client ratings
  - Never returns admin users

**Frontend:**
- `frontend/src/pages/admin/AdminUsers.jsx` → component (line ~1)
  - 4 tabs: All / Clients / Sellers / Unverified Sellers
  - 300ms debounced search
  - `verificationScore(seller)` function (line ~50): locally computes 4 criteria
  - `handleVerify()`, `handleRevoke()`, `handleChangeRole()` with confirm modals

**API endpoint:** `GET /api/v1/admin/users?role=X&search=Y&page=Z` — auth: required, role: admin

---

### Feature: Admin Product Management (view all, delete)

**What it does:** Admin can see ALL products (active and inactive) and force-delete any product with complete cleanup.

**Backend:**
- `backend/src/services/admin.service.js` → `getProducts()` (line ~425), `deleteProduct()` (line ~348)
  - `getProducts`: no `is_active` filter (returns all)
  - `deleteProduct`: parallel cleanup of all child records then product

**Frontend:**
- `frontend/src/pages/admin/AdminProducts.jsx` → component (line ~1)
  - Active/hidden badge on each product
  - Delete confirmation modal

**API endpoints:** `GET /api/v1/admin/products`, `DELETE /api/v1/admin/products/:id` — auth: required, role: admin

---

## AI CHATBOT

---

### Feature: Chatbot Widget (open/close, send message)

**What it does:** Floating chat button (bottom-right) for authenticated users only. Sends messages to Google Gemini 2.5 Flash. Maintains conversation history for context.

**Backend:**
- `backend/src/services/chatbot.service.js` → `sendMessage()` (line ~61)
  - Uses `gemini-2.5-flash` model
  - `buildCombinedContents()` (line ~39): converts history to Gemini format (`'model'` for assistant turns)
  - `SYSTEM_INSTRUCTION` (line ~7): defines AI persona as Hirftna assistant
  - Falls back to `FALLBACK_REPLY` on any error
- `backend/src/routes/chatbot.routes.js` → `POST /` with `chatbotLimiter` (20 req/hour per user)

**Frontend:**
- `frontend/src/components/chatbot/ChatbotWidget.jsx` → component (line ~1)
  - Floating sage button: `fixed bottom-20 right-4`, only for authenticated users
  - Chat panel: 380px desktop / full-width mobile
  - Suggestion chips on first open
  - Enter to send, Shift+Enter for newline
  - Sends last 20 history turns: `chatbotAPI.sendMessage(text, messages.slice(-20))`
  - Typing indicator (animated dots)

**API endpoint:** `POST /api/v1/chatbot` — auth: required, rate-limited 20/hour per user

**To demo:** Login → see floating green circle (bottom-right) → click → type a question

---

## INTERNATIONALIZATION

---

### Feature: Language Switching (EN ↔ AR)

**What it does:** Switches the entire UI between English and Arabic, including RTL layout direction.

**Frontend:**
- `frontend/src/i18n/index.jsx` → `LanguageProvider` + `useTranslation()` (line ~1)
  - `setLang(code)`: calls `i18n.changeLanguage(code)` + `syncDocumentLanguage(code)`
  - `syncDocumentLanguage()` (line ~31): sets `document.documentElement.lang`, `document.documentElement.dir`
  - Arabic → `dir="rtl"`, English → `dir="ltr"`
  - Stored in `localStorage` key `hirftna_lang`
- `frontend/src/components/ui/LanguageSwitcher.jsx` → component (line ~1)
  - Two variants: `compact` (globe + abbreviation) and `full` (dropdown)

**To demo:** Click "AR" / "EN" in top bar → see layout flip to RTL

---

### Feature: RTL Layout (Arabic mode)

**What it does:** All layout, icons, and animations automatically mirror for right-to-left Arabic text.

**Frontend:**
- `frontend/src/index.css` → RTL CSS rules
  - `[dir="rtl"] .animate-fade-in-left` → swaps to `fadeInRight`
  - Input icons use `start-3.5` / `end-3.5` (CSS logical properties) that flip in RTL
  - Input padding: `ps-10` / `pe-11` (logical properties)
- `frontend/tailwind.config.js` → `font-sans: ["Plus Jakarta Sans", "Readex Pro", ...]`
  - Readex Pro activates as Arabic body font in RTL mode

**To demo:** Switch to Arabic → see all text go RTL, layout flip, icons move to correct side

---

### Feature: Category Translation (i18n mapping)

**What it does:** Category names from the database (stored in English) are displayed in the user's language.

**Frontend:**
- `frontend/src/utils/categoryHelpers.js` → `CATEGORY_SLUG_TO_I18N_KEY` map (line ~1)
  - Maps slugs: `'jewelry' → 'categories.jewelry'`, `'pottery' → 'categories.pottery'`, etc.
- `frontend/src/utils/categoryIcons.jsx` → `getCategoryIcon(slug)` (line ~1)
  - Maps slugs to Lucide icons: `jewelry → Gem`, `pottery → Hammer`, etc.
- Translation lookup: `t('categories.' + category.slug)` in components

**To demo:** Switch to Arabic → see category names like "مجوهرات" instead of "Jewelry"

---

### Feature: Notification Translation (type-based with interpolation)

**What it does:** Notification messages are stored as type keys + meta data. The frontend translates them with dynamic values interpolated.

**Frontend:**
- `frontend/src/utils/notificationText.js` → `getNotificationText(notification, t)` (line ~1)
  - `t('notifications.new_order.title', { clientName: meta.clientName })`
  - → English: "New order from Ahmed"
  - → Arabic: "طلب جديد من Ahmed"

**Database:** `notifications.type` = i18n key, `notifications.meta` = JSON interpolation vars

---

## DESIGN SYSTEM

---

### Feature: Color Palette (cream, sage, brick, warm)

**Where it's defined:**
- `frontend/tailwind.config.js` → `extend.colors` (line ~1)
  - `cream-100: '#FDF9F3'` — main page background
  - `sage-500: '#728C67'` — primary accent (buttons, badges, verified)
  - `warm-800: '#35322A'` — main text color
  - `brick-500: '#8B3A2A'` — hearts, wishlist, notification dots
  - `warning: '#C4862A'` — stars, pending badges
  - `danger: '#C0443A'` — error states, rejected status

**To demo:** Inspect any page element → see custom color names in computed styles

---

### Feature: Typography (Plus Jakarta Sans, Readex Pro, Amiri)

**Where it's defined:**
- `frontend/index.html` → Google Fonts link (line ~7)
  - Plus Jakarta Sans (400–800 weight) — LTR body
  - Readex Pro (400–700) — RTL Arabic body
  - Amiri (400, 700) — logo Arabic text "حرفتنا"
  - Inter (500–700) — logo Latin wordmark "MARKETPLACE"
- `frontend/tailwind.config.js` → `fontFamily.sans: ["Plus Jakarta Sans", "Readex Pro", ...]`

**To demo:** Open LogoMark component → see Amiri font for "حرفتنا"

---

### Feature: Logo Component (LogoMark with Amiri font)

**Where it's defined:**
- `frontend/src/components/ui/LogoMark.jsx` → component (line ~1)
  - Arabic line: `font-family: Amiri` (via Tailwind custom class `font-ar`)
  - Latin line: `font-family: Inter` with wide letter-spacing
  - Text from i18n: `t('common.appNameArabic')` = "حرفتنا", `t('common.appNameLatin')` = "MARKETPLACE"
  - Sizes: `sm`, `md`, `lg`

---

### Feature: Loading Skeletons & Empty States

**Where it's defined:**
- `frontend/src/index.css` → `.skeleton` class: `background-size` animated gradient pulse
- `frontend/src/components/product/ProductCardSkeleton.jsx` — product loading placeholder
- `frontend/src/components/product/ProductSkeleton.jsx` — full grid of skeletons
- Each page has its own empty state component (SVG illustration + message + CTA)

**To demo:** Throttle network in DevTools to "Slow 3G" → refresh browse page → see skeleton animation

---

### Feature: Responsive Layout (mobile ↔ desktop)

**Where it's defined:**
- `frontend/src/components/layout/BottomNav.jsx` — mobile only (`md:hidden`)
- `frontend/src/components/layout/DesktopNav.jsx` — desktop only (`hidden md:flex`)
- `frontend/src/components/layout/TopBar.jsx` — different layouts at `md:` breakpoint
- Breakpoints in `tailwind.config.js`: `xs=380px`, `sm=640px`, `md=768px`, `lg=1024px`

---

## SECURITY

---

### Feature: JWT Authentication (where tokens are created, verified, refreshed)

**Created:**
- `backend/src/services/auth.service.js` → `login()` (line ~293): `supabasePublic.auth.signInWithPassword()` → Supabase issues the JWT

**Verified:**
- `backend/src/middlewares/auth.middleware.js` → `authenticate()` (line ~79)
  - `verifySupabaseToken(token)` (line ~33): calls `supabasePublic.auth.getUser(token)` with 6s timeout + 1 retry
  - Supabase validates JWT signature; if expired → returns error

**Refreshed:**
- `backend/src/services/auth.service.js` → `refreshToken()` (line ~350)
- `frontend/src/services/api.js` → response interceptor (line ~297) + `refreshAccessToken()` (line ~278)

**Stored:**
- `localStorage`: `hirftna_token`, `hirftna_refresh_token`, `hirftna_user`
- Frontend: `frontend/src/services/api.js` → `storeSession()` (line ~95), `AUTH_STORAGE_KEYS` (line ~27)

---

### Feature: Rate Limiting (where each limiter is defined and applied)

**Where defined and applied:**
- `backend/src/app.js` (lines ~101-146) — all limiters defined here:
  - `publicReadLimiter` (line ~103): 2000/15min → applied to `/categories` + `/products` (line ~177-180)
  - `globalLimiter` (line ~116): 500/15min → applied to `/api` (line ~130)
  - `authLimiter` (line ~133): 30/15min, skip successful → applied to `/api/v1/auth` (line ~146)
- Per-user limiters (separate, not in app.js):
  - `uploadLimiter`: 20/15min per `user.id` — in `backend/src/routes/upload.routes.js`
  - `chatbotLimiter`: 20/hour per `user.id` — in `backend/src/routes/chatbot.routes.js`
  - `forgotPasswordLimiter`: 5/15min per IP — in `backend/src/routes/auth.routes.js`

**Requires `trust proxy`:**
- `backend/src/app.js` line ~94: `app.set('trust proxy', 1)` — reads real IP from `X-Forwarded-For` (Render proxy)

---

### Feature: Input Validation with Zod (where schemas are defined and used)

**Schemas defined in:** `backend/src/validators/` directory
- `auth.validator.js` — register, login, OTP, change-password, forgot/reset password schemas
- `product.validator.js` — create/update product, product query schema
- `order.validator.js` — create order, update status, mark ready, order query
- `seller.validator.js` — create/update seller profile
- `review.validator.js` — create review, create rating
- `promotion.validator.js` — request promotion
- `chatbot.validator.js` — message + conversation history (max 20 turns)

**Validation applied in:** `backend/src/middlewares/validate.middleware.js` → `validate({ body, params, query })` (line ~37)

**Data accessed in controllers:** `req.validated.body` (NEVER `req.body` directly)

---

### Feature: CORS Configuration

**Where defined:** `backend/src/app.js` → cors() config (lines ~27-57)
- Allowed origins: `process.env.CLIENT_URL` + localhost (non-production) + `https://hirftna.vercel.app`
- `credentials: true` — allows Authorization headers
- Methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- Unknown origins → logs warning + returns 403

---

### Feature: Helmet Security Headers

**Where applied:** `backend/src/app.js` → `app.use(helmet())` (line ~23)
- Applied FIRST before all other middleware
- Adds: Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security, Referrer-Policy, and more

---

### Feature: Ownership Checks

**Where implemented:** In service files, not middleware:
- Orders: `backend/src/services/order.service.js` → `getOrderById()` (line ~274), `updateOrderStatus()` (line ~393), `markReady()` (line ~486), `confirmComplete()` (line ~550)
- Products: `backend/src/services/product.service.js` → `updateProduct()` + `deleteProduct()` — checks `product.seller_id !== seller.id`
- Notifications: `backend/src/services/notification.service.js` → `markAsRead()` (line ~81), `deleteNotification()` — checks `notification.user_id !== userId`

**Pattern:**
```javascript
if (order.seller_id !== seller.id) {
  throw new AppError('You do not have permission to update this order', 403);
}
```

---

### Feature: OTP Security (expiry, max attempts, timing-safe comparison)

**Where implemented:** `backend/src/services/auth.service.js` → `verifyOtp()` (line ~388)

**Key security measures:**
- `expires_at` check: expired sessions auto-deleted on each verification call
- `attempts >= 5`: throws 429 and DELETES the session (no further attempts possible)
- `crypto.timingSafeEqual()` (line ~414): prevents timing oracle attacks on hash comparison
- `hashOtp()` (line ~90): SHA-256 hash — OTP plaintext never stored in DB

---

### Feature: Upload Rate Limiting (per-user)

**Where defined:** `backend/src/routes/upload.routes.js`
```javascript
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user.id,  // per-user, not per-IP
});
```
Applied to both `POST /image` and `POST /images`.

---

## DEPLOYMENT

---

### Feature: Vercel Configuration (SPA routing)

**Where defined:** `frontend/vercel.json` (line ~1)
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
Without this, direct URL access to `/seller/dashboard` returns 404 from Vercel's CDN.

**Build command:** `npm run build` → Vite → `dist/` folder
**Live URL:** `https://hirftna.vercel.app`

---

### Feature: Render Configuration (start script, env vars)

**Start script:** `backend/package.json` → `"start": "node src/server.js"`
**Health check:** `GET /health` — used by Render to verify server is running
**Cold start:** Free tier: ~30s on first request after 15min idle
**Live URL:** `https://hirftna-backend.onrender.com`

---

### Feature: VITE_API_URL Build Guard

**Where defined:** `frontend/src/services/api.js` (lines ~11-25)
```javascript
const API_BASE_URL = (() => {
  const url = import.meta.env.VITE_API_URL;
  if (!url && import.meta.env.PROD) {
    throw new Error('VITE_API_URL is not set...');
  }
  return url || 'http://localhost:4000/api/v1';
})();
```
Also in `frontend/vite.config.js` (lines ~7-12): same guard at build time.

**Effect:** If `VITE_API_URL` is not set in Vercel env vars, the Vite build FAILS — prevents deploying a broken app.

---

### Feature: Environment Variables (where each is used in code)

| Variable | Where Used |
|----------|-----------|
| `SUPABASE_URL` | `backend/src/config/supabase.js` line ~26,39 |
| `SUPABASE_ANON_KEY` | `backend/src/config/supabase.js` line ~26 (supabasePublic) |
| `SUPABASE_SERVICE_ROLE_KEY` | `backend/src/config/supabase.js` line ~39 (supabaseAdmin) |
| `CLIENT_URL` | `backend/src/app.js` CORS origin line ~29; `backend/src/services/auth.service.js` reset link line ~590 |
| `JWT_SECRET` | `backend/src/config/env.js` validation only; Supabase manages actual signing |
| `AUTH_OTP_ENABLED` | `backend/src/services/auth.service.js` → `isOtpEnabled()` line ~41 |
| `SMTP_*` | `backend/src/services/auth.service.js` → `smtpTransporter` line ~46 |
| `GEMINI_API_KEY` | `backend/src/services/chatbot.service.js` → `getClient()` line ~28 |
| `VITE_API_URL` | `frontend/src/services/api.js` → `API_BASE_URL` line ~12 |
| `PORT` | `backend/src/server.js` line ~22 |

---

## QUICK REFERENCE CARD

| "Show me X" | Open this file | Function/Line |
|-------------|----------------|---------------|
| Registration | `backend/src/services/auth.service.js` | `register()` ~L134 |
| OTP verification | `backend/src/services/auth.service.js` | `verifyOtp()` ~L388 |
| Login | `backend/src/services/auth.service.js` | `login()` ~L293 |
| Token refresh | `frontend/src/services/api.js` | response interceptor ~L297 |
| JWT verification | `backend/src/middlewares/auth.middleware.js` | `authenticate()` ~L79 |
| Custom order form | `frontend/src/components/order/CustomOrderForm.jsx` | full component |
| Create order | `backend/src/services/order.service.js` | `createOrder()` ~L148 |
| Order state machine | `backend/src/services/order.service.js` | `VALID_TRANSITIONS` ~L43 |
| Accept order | `backend/src/services/order.service.js` | `updateOrderStatus()` ~L371 |
| Mark ready | `backend/src/services/order.service.js` | `markReady()` ~L464 |
| Confirm complete | `backend/src/services/order.service.js` | `confirmComplete()` ~L537 |
| Rate limiting | `backend/src/app.js` | limiters ~L101 |
| CORS | `backend/src/app.js` | cors() ~L27 |
| Helmet headers | `backend/src/app.js` | helmet() ~L23 |
| Zod validation | `backend/src/middlewares/validate.middleware.js` | `validate()` ~L37 |
| Error handling | `backend/src/middlewares/error.middleware.js` | `errorHandler()` ~L41 |
| Two Supabase clients | `backend/src/config/supabase.js` | supabasePublic/Admin ~L26,39 |
| Notification creation | `backend/src/services/order.service.js` | `createNotification()` ~L57 |
| Notification display | `frontend/src/utils/notificationText.js` | `getNotificationText()` ~L1 |
| Notification polling | `frontend/src/components/layout/MainLayout.jsx` | polling effect ~L12 |
| Chatbot | `backend/src/services/chatbot.service.js` | `sendMessage()` ~L61 |
| Promotion request | `backend/src/services/promotion.service.js` | `requestPromotion()` ~L13 |
| Admin stats | `backend/src/services/admin.service.js` | `getStats()` ~L143 |
| Seller verification | `backend/src/services/verification.service.js` | `updateVerificationStatus()` ~L94 |
| Image upload | `backend/src/services/upload.service.js` | `uploadImage()` ~L167 |
| i18n setup | `frontend/src/i18n/index.jsx` | full file |
| RTL support | `frontend/src/index.css` | `[dir="rtl"]` rules |
| Category translation | `frontend/src/utils/categoryHelpers.js` | `CATEGORY_SLUG_TO_I18N_KEY` ~L1 |
| AuthContext | `frontend/src/context/AuthContext.jsx` | full file |
| Route guards | `frontend/src/router/index.jsx` | guards ~L67 |
| Global order form event | `frontend/src/router/index.jsx` | `RootLayout` ~L184 |
| Vercel SPA config | `frontend/vercel.json` | full file |
| DB migrations | `backend/migrations/` | 5 SQL files |
| DB schema | `CONTEXT.md` | Tables section |
