import axios from 'axios';
import {
  parseChangePasswordPayload,
  parseLoginPayload,
  parseOrderPayload,
  parseRegisterPayload,
  parseVerifyOtpPayload,
} from '../utils/validation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

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

export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message || error?.message || fallback;
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

    return Promise.reject(error);
  }
);

/* ================= APIs ================= */

export const authAPI = {
  register: (data) => api.post('/auth/register', parseRegisterPayload(data)),
  login: (data) => api.post('/auth/login', parseLoginPayload(data)),
  verifyOtp: (data) => api.post('/auth/verify-otp', parseVerifyOtpPayload(data)),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', parseChangePasswordPayload(data)),
};

export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
};

export const ordersAPI = {
  create: (data) => {
    const payload = parseOrderPayload(data);
    return api.post('/orders', payload);
  },
};
// ================== CATEGORIES ==================
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  getBySlug: (slug) => api.get(`/categories/slug/${slug}`),
};

// ================== SELLERS ==================
export const sellersAPI = {
  getAll: (params) => api.get('/sellers', { params }),
  getById: (id) => api.get(`/sellers/${id}`),
  getMe: () => api.get('/sellers/me'),
  getAnalytics: () => api.get('/sellers/analytics'),
  create: (data) => api.post('/sellers', data),
  update: (id, data) => api.put(`/sellers/${id}`, data),
};

// ================== REVIEWS ==================
export const reviewsAPI = {
  getProductReviews: (id, params) =>
    api.get(`/reviews/product/${id}`, { params }),

  getSellerRatings: (id, params) =>
    api.get(`/reviews/seller/${id}`, { params }),

  getSellerReviews: (id, params) =>
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