import axios from 'axios';
import {
  parseChangePasswordPayload,
  parseLoginPayload,
  parseOrderPayload,
  parseRegisterPayload,
  parseVerifyOtpPayload,
} from '../utils/validation';

// IIFE ensures the check runs as part of API_BASE_URL evaluation — cannot be tree-shaken
const API_BASE_URL = (() => {
  const url = import.meta.env.VITE_API_URL;
  if (!url && import.meta.env.PROD) {
    throw new Error(
      'VITE_API_URL is not set. The application cannot start. ' +
      'Configure this environment variable in your Vercel deployment settings.'
    );
  }
  if (!url) {
    // Dev-only fallback with visible warning
    // eslint-disable-next-line no-console
    console.warn('⚠️  VITE_API_URL not set, falling back to http://localhost:4000/api/v1');
  }
  return url || 'http://localhost:4000/api/v1';
})();

const AUTH_STORAGE_KEYS = {
  token: 'hirftna_token',
  refreshToken: 'hirftna_refresh_token',
  user: 'hirftna_user',
};

const LIST_ALIASES = [
  'items',
  'products',
  'orders',
  'notifications',
  'reviews',
  'ratings',
  'sellers',
  'categories',
];

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;
let mePromise = null;
let cachedUser = readStoredUser();
const failedQueue = [];

function readStoredUser() {
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.user);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

function createUserResponse(user) {
  return {
    data: {
      success: true,
      data: { user },
    },
  };
}

function flushFailedQueue(error, token = null) {
  while (failedQueue.length > 0) {
    const request = failedQueue.shift();
    if (error) request.reject(error);
    else request.resolve(token);
  }
}

/* ================= SESSION ================= */

export function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  cachedUser = null;
  mePromise = null;
}

export function storeSession(data) {
  if (data?.token) {
    localStorage.setItem(AUTH_STORAGE_KEYS.token, data.token);
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  }

  if (data?.refresh_token) {
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, data.refresh_token);
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  }

  if (data?.user) {
    cachedUser = data.user;
    localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(data.user));
  } else {
    cachedUser = null;
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  }
}

export function updateStoredUser(user) {
  const current = getStoredSession();
  storeSession({
    token: current.token,
    refresh_token: current.refreshToken,
    user,
  });
}

export function getStoredSession() {
  return {
    token: localStorage.getItem(AUTH_STORAGE_KEYS.token),
    refreshToken: localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken),
    user: localStorage.getItem(AUTH_STORAGE_KEYS.user),
  };
}

export function getCachedUser() {
  return cachedUser;
}

/* ================= ERRORS ================= */

// Action hints per HTTP status — shown below the error message
const STATUS_HINTS = {
  400: 'Please check the form and try again.',
  401: 'Your session may have expired — please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource could not be found.',
  409: 'Please use a different value and try again.',
  422: 'Some fields contain invalid data — check the form.',
  429: 'Too many attempts. Please wait a moment before trying again.',
  500: 'A server error occurred. Please try again in a moment.',
  503: 'The service is temporarily unavailable. Please try later.',
};

/**
 * Returns { message, hint, status } from any API or network error.
 * - message: the backend's own message when available, fallback otherwise
 * - hint:    a short action instruction based on the HTTP status
 * - status:  the HTTP status code, or null for network errors
 */
export function resolveApiError(error, fallback = 'Something went wrong. Please try again.') {
  // Network / timeout / no connection
  if (!error?.response) {
    const msg = String(error?.message || '').toLowerCase();
    if (error?.code === 'ECONNABORTED' || msg.includes('timeout')) {
      return { message: 'The request timed out.', hint: 'Check your internet connection and try again.', status: null };
    }
    return { message: 'Cannot reach the server.', hint: 'Check your internet connection and try again.', status: null };
  }

  const status  = error.response.status;
  const message = error.response.data?.message || fallback;
  const hint    = STATUS_HINTS[status] ?? null;

  return { message, hint, status };
}

// Backwards-compatible helpers (used throughout the app)
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  return resolveApiError(error, fallback).message;
}

export function getApiErrorFields(error) {
  return error?.response?.data?.errors || {};
}

export function isTransientApiError(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = error?.code || '';

  return (
    !error?.response ||
    code === 'ECONNABORTED' ||
    message.includes('network') ||
    message.includes('timeout')
  );
}

export function isTerminalAuthError(error) {
  const status = error?.response?.status;
  return status === 400 || status === 401 || status === 403;
}

/* ================= NORMALIZE ================= */

export function normalizeApiResponse(response, options = {}) {
  const { itemKeys = [], entityKey = null, fallbackEntity = null } = options;
  const data = response?.data?.data ?? null;
  const keys = [...LIST_ALIASES, ...itemKeys];

  let items = [];

  if (Array.isArray(data)) {
    items = data;
  } else {
    const matchedKey = keys.find((key) => Array.isArray(data?.[key]));
    if (matchedKey) {
      items = data[matchedKey];
    }
  }

  let entity = null;
  if (entityKey && data && typeof data === 'object' && !Array.isArray(data)) {
    entity = data[entityKey] ?? fallbackEntity;
  } else if (!entityKey && data && !Array.isArray(data)) {
    entity = data;
  }

  return {
    raw: response?.data ?? null,
    data,
    items,
    entity,
    pagination: data?.pagination ?? null,
  };
}

export function extractApiItems(response, options = {}) {
  return normalizeApiResponse(response, options).items;
}

export function extractApiEntity(response, entityKey, fallbackEntity = null) {
  return normalizeApiResponse(response, { entityKey, fallbackEntity }).entity;
}

export function extractApiPagination(response, options = {}) {
  return normalizeApiResponse(response, options).pagination;
}

/* ================= INTERCEPTORS ================= */

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ================= REFRESH ================= */

async function performRefresh() {
  const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
  if (!refreshToken) throw new Error('Missing refresh token');

  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken,
  });

  const session = response?.data?.data ?? null;

  if (!session?.token) {
    throw new Error('Missing token in refresh response');
  }

  storeSession(session);
  return session.token;
}

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = performRefresh()
      .then((token) => {
        flushFailedQueue(null, token);
        return token;
      })
      .catch((error) => {
        flushFailedQueue(error, null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken)
    ) {
      original._retry = true;

      try {
        const newToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        clearStoredSession();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Token is expired and there is no refresh token — session is fully dead.
    // Redirect to login instead of surfacing a raw 401 to the component.
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      localStorage.getItem(AUTH_STORAGE_KEYS.token) &&
      !localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken)
    ) {
      clearStoredSession();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

/* ================= APIs ================= */

export const authAPI = {
  register:       (data) => api.post('/auth/register', parseRegisterPayload(data)),
  login:          (data) => api.post('/auth/login', parseLoginPayload(data)),
  verifyOtp:      (data) => api.post('/auth/verify-otp', parseVerifyOtpPayload(data)),
  logout:         ()     => api.post('/auth/logout'),
  getMe:          ()     => api.get('/auth/me'),
  updateMe:       (data) => api.put('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', parseChangePasswordPayload(data)),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
};

export const productsAPI = {
  getAll:        (params)     => api.get('/products', { params }),
  getById:       (id)         => api.get(`/products/${id}`),
  getMyProducts: (params)     => api.get('/products/my-products', { params }),
  create:        (data)       => api.post('/products', data),
  update:        (id, data)   => api.put(`/products/${id}`, data),
  delete:        (id)         => api.delete(`/products/${id}`),
};

export const ordersAPI = {
  create:          (data)       => api.post('/orders', parseOrderPayload(data)),
  getAll:          (params)     => api.get('/orders', { params }),
  getById:         (id)         => api.get(`/orders/${id}`),
  updateStatus:    (id, data)   => api.patch(`/orders/${id}/status`, data),
  markReady:       (id, data)   => api.patch(`/orders/${id}/ready`, data),
  confirmComplete: (id)         => api.patch(`/orders/${id}/complete`),
};

// ================== USERS (public profiles) ==================
export const usersAPI = {
  getPublicProfile: (id) => api.get(`/users/${id}/public`),
};

// ================== CLIENT RATINGS ==================
export const clientRatingsAPI = {
  create:      (data)       => api.post('/client-ratings', data),
  getByClient: (clientId)   => api.get(`/client-ratings/client/${clientId}`),
};

// ================== CATEGORIES ==================
// getAll is cached in memory — categories rarely change.
// All pages share the same result; at most one network call per 10 minutes.
let _categoriesCache = null;
let _categoriesCacheTime = 0;
const _CATEGORIES_TTL = 10 * 60 * 1000; // 10 minutes

export const categoriesAPI = {
  getAll: async () => {
    const now = Date.now();
    if (_categoriesCache && (now - _categoriesCacheTime) < _CATEGORIES_TTL) {
      return _categoriesCache;
    }
    const res = await api.get('/categories');
    _categoriesCache = res;
    _categoriesCacheTime = Date.now();
    return res;
  },
  invalidateCache: () => { _categoriesCache = null; },
  getById:   (id)        => api.get(`/categories/${id}`),
  getBySlug: (slug)      => api.get(`/categories/slug/${slug}`),
  create:    (data)      => api.post('/categories', data),
  update:    (id, data)  => api.put(`/categories/${id}`, data),
  delete:    (id)        => api.delete(`/categories/${id}`),
};

// ================== SELLERS ==================
export const sellersAPI = {
  getAll: (params) => api.get('/sellers', { params }),
  getById: (id) => api.get(`/sellers/${id}`),
  getMe: () => api.get('/sellers/me'),
  getAnalytics: () => api.get('/sellers/analytics'),
  getVerificationStatus: () => api.get('/sellers/me/verification-status'),
  create: (data) => api.post('/sellers', data),
  update: (id, data) => api.put(`/sellers/${id}`, data),
};

// ================== REVIEWS ==================
export const reviewsAPI = {
  getProductReviews: (id, params) =>
    api.get(`/reviews/product/${id}`, { params }),

  getSellerRatings: (id, params) =>
    api.get(`/reviews/seller/${id}`, { params }),

  createReview: (data) => api.post('/reviews/product', data),
  createRating: (data) => api.post('/reviews/seller', data),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
};

// ================== WISHLIST ==================
export const wishlistAPI = {
  getAll: (params) => api.get('/wishlist', { params }),
  add: (productId) =>
    api.post('/wishlist', { product_id: productId }),
  remove: (productId) =>
    api.delete(`/wishlist/${productId}`),
  check: (productId) =>
    api.get(`/wishlist/${productId}/check`),
};

// ================== NOTIFICATIONS ==================
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () =>
    api.get('/notifications/unread-count'),
  markRead: (id) =>
    api.patch(`/notifications/${id}/read`),
  markAllRead: () =>
    api.patch('/notifications/mark-all-read'),
  delete: (id) =>
    api.delete(`/notifications/${id}`),
};

// ================== UPLOADS ==================
export const uploadsAPI = {
  uploadImage: (fileOrFormData) => {
    const formData =
      fileOrFormData instanceof FormData
        ? fileOrFormData
        : (() => {
            const next = new FormData();
            next.append('image', fileOrFormData);
            return next;
          })();

    return api.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadImages: (files) => {
    const formData = new FormData();
    const arr = Array.isArray(files) ? files : [files];
    arr.forEach((file) =>
      formData.append('images', file)
    );

    return api.post('/uploads/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
// ================== CHATBOT ==================
export const chatbotAPI = {
  sendMessage: (message, conversationHistory = []) =>
    api.post('/chatbot', { message, conversation_history: conversationHistory }),
};

// ================== PROMOTIONS ==================
export const promotionsAPI = {
  getHeroAds:              ()       => api.get('/promotions/hero'),
  getBrowseAds:            ()       => api.get('/promotions/browse'),
  getFeaturedProducts:     (params) => api.get('/promotions/featured-products', { params }),
  request:                 (data)   => api.post('/promotions/request', data),
  getMe:                   ()       => api.get('/promotions/me'),
  getMyProductPromotions:  ()       => api.get('/promotions/my-product-promotions'),
};

// ================== ADMIN ==================
export const adminAPI = {
  getUsers:          (params)               => api.get('/admin/users', { params }),
  getProducts:       (params)               => api.get('/admin/products', { params }),
  getStats:          ()                     => api.get('/admin/stats'),
  verifySeller:      (sellerId, isVerified) => api.patch(`/admin/sellers/${sellerId}/verify`, { is_verified: isVerified }),
  deleteProduct:     (productId)            => api.delete(`/admin/products/${productId}`),
  updateUserRole:    (userId, role)         => api.patch(`/admin/users/${userId}/role`, { role }),
  getPromotions:     (params)               => api.get('/admin/promotions', { params }),
  activatePromotion: (id)                   => api.patch(`/admin/promotions/${id}/activate`),
  rejectPromotion:   (id, reason)           => api.patch(`/admin/promotions/${id}/reject`, { rejection_reason: reason }),
};

export const apiUtils = {
  clearStoredSession,
  storeSession,
  updateStoredUser,
  getStoredSession,
  getCachedUser,
  getApiErrorMessage,
  getApiErrorFields,
  isTransientApiError,
  isTerminalAuthError,
  normalizeApiResponse,
  extractApiItems,
  extractApiEntity,
  extractApiPagination,
};

export default api;
