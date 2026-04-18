import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Layout ────────────────────────────────────────────────────────────────────
import MainLayout from '../components/layout/MainLayout';

// ── Phase 7: CustomOrderForm mounted at root — always listening for the event ─
import CustomOrderForm from '../components/order/CustomOrderForm';

// ── Public pages ──────────────────────────────────────────────────────────────
import HomePage     from '../pages/HomePage';
import BrowsePage   from '../pages/BrowsePage';
import ProductPage  from '../pages/ProductPage';
import SellerPage   from '../pages/SellerPage';
import NotFoundPage from '../pages/NotFoundPage';

// ── Auth pages ────────────────────────────────────────────────────────────────
import LoginPage    from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';

// ── Client pages ──────────────────────────────────────────────────────────────
import OrdersPage   from '../pages/client/OrdersPage';
import WishlistPage from '../pages/client/WishlistPage';
import ProfilePage  from '../pages/client/ProfilePage';

// ── Seller pages ──────────────────────────────────────────────────────────────
import SellerDashboard   from '../pages/seller/SellerDashboard';
import SellerOrdersPage  from '../pages/seller/SellerOrdersPage';
import SellerProfileEdit from '../pages/seller/SellerProfileEdit';
import SellerProducts    from '../pages/seller/SellerProducts';

// ── Shared pages ──────────────────────────────────────────────────────────────
import NotificationsPage from '../pages/NotificationsPage';

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE GUARDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RequireAuth — the user must be logged in, regardless of role.
 *
 * Used for: wishlist, notifications, orders, profile.
 * Both clients AND sellers pass this guard.
 *
 * Preserves the attempted URL in location.state so LoginPage can redirect back
 * to the original destination after a successful login.
 */
function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // While AuthContext is hydrating from localStorage, show a blank cream screen
  // instead of flashing the login redirect — prevents a jarring UX on cold load
  if (loading) return <div className="min-h-screen bg-cream-100" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * RequireSeller — the user must be logged in AND have role = 'seller'.
 *
 * Used for: seller dashboard, seller orders, seller products, seller profile.
 *
 * If a client tries to navigate to /seller/dashboard, they're sent home (not to
 * login) because they're already authenticated — just not the right role.
 */
function RequireSeller({ children }) {
  const { isSeller, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen bg-cream-100" />;

  if (!isAuthenticated) {
    // Not logged in at all → go to login and preserve the destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isSeller) {
    // Logged in but wrong role → go home, no redirect loop
    return <Navigate to="/" replace />;
  }

  return children;
}

/**
 * GuestOnly — the user must NOT be logged in.
 *
 * Used for: /login and /register.
 * Prevents a logged-in user from seeing the auth forms again.
 * They're simply redirected home.
 */
function GuestOnly({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT LAYOUT WRAPPER
//
// This is the key architectural decision that makes CustomOrderForm work
// across the entire app. By mounting it alongside MainLayout (not inside any
// specific page), it stays in the React tree for the full session.
//
// When ProductPage fires:
//   window.dispatchEvent(new CustomEvent('open-order-form', { detail: { product } }))
//
// ...CustomOrderForm hears it from here, regardless of what page is currently
// rendered in the <Outlet> below.
// ─────────────────────────────────────────────────────────────────────────────
function RootLayout() {
  return (
    <>
      <MainLayout />
      <CustomOrderForm />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [

      // ── Public routes ─────────────────────────────────────────────────────
      // No auth required — visitors can browse freely
      { index: true,          element: <HomePage />    },
      { path: 'browse',       element: <BrowsePage />  },
      { path: 'products/:id', element: <ProductPage /> },
      { path: 'sellers/:id',  element: <SellerPage />  },

      // ── Auth routes ───────────────────────────────────────────────────────
      // Guests only — logged-in users are redirected home
      {
        path: 'login',
        element: <GuestOnly><LoginPage /></GuestOnly>,
      },
      {
        path: 'register',
        element: <GuestOnly><RegisterPage /></GuestOnly>,
      },

      // ── Authenticated routes — BOTH clients AND sellers ───────────────────
      //
      // WISHLIST FIX:
      // Previously this was guarded with RequireSeller or a client-only check.
      // The Project Brain (§2.3) states explicitly: "A seller can also PLACE
      // orders from other sellers (outgoing orders)." Sellers browse and buy
      // just like clients. Therefore wishlist must be available to any
      // authenticated user, regardless of role.
      // RequireAuth covers both roles — this is the correct guard here.
      {
        path: 'wishlist',
        element: <RequireAuth><WishlistPage /></RequireAuth>,
      },
      {
        path: 'notifications',
        element: <RequireAuth><NotificationsPage /></RequireAuth>,
      },

      // ── Client routes ─────────────────────────────────────────────────────
      // Also accessible to sellers when they act as buyers
      // (e.g. /orders shows outgoing orders for sellers via ?as=client param)
      {
        path: 'orders',
        element: <RequireAuth><OrdersPage /></RequireAuth>,
      },
      {
        path: 'profile',
        element: <RequireAuth><ProfilePage /></RequireAuth>,
      },

      // ── Seller-only routes ────────────────────────────────────────────────
      // RequireSeller redirects clients to / and unauthenticated users to /login
      {
        path: 'seller/dashboard',
        element: <RequireSeller><SellerDashboard /></RequireSeller>,
      },
      {
        path: 'seller/products',
        element: <RequireSeller><SellerProducts /></RequireSeller>,
      },
      {
        path: 'seller/orders',
        element: <RequireSeller><SellerOrdersPage /></RequireSeller>,
      },
      {
        path: 'seller/profile',
        element: <RequireSeller><SellerProfileEdit /></RequireSeller>,
      },

      // ── 404 catch-all ─────────────────────────────────────────────────────
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}