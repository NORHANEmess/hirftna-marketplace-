import axios from 'axios';

const AUTH_STORAGE_KEYS = {
  token: 'hirftna_token',
  refreshToken: 'hirftna_refresh_token',
  user: 'hirftna_user',
};

function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
  localStorage.removeItem(AUTH_STORAGE_KEYS.user);
}

function storeSession(data) {
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
    localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(data.user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
  }
}

// ─────────────────────────────────────────────────────────────
// AXIOS INSTANCE
// All API calls go through this single instance
// ─────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────────────────────────
// REQUEST INTERCEPTOR
// Automatically attaches token to every request
// ─────────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────
// RESPONSE INTERCEPTOR
// Handles token expiry globally
// ─────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Token expired → try refresh once
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken)
    ) {
      original._retry = true;

      try {
        const refresh = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'}/auth/refresh`,
          { refresh_token: localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken) }
        );

        const refreshedSession = refresh.data?.data;
        const newToken = refreshedSession?.token;

        if (!newToken) {
          throw new Error('Missing token in refresh response');
        }

        storeSession(refreshedSession);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // Refresh failed → clear storage and redirect to login
        clearStoredSession();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────
export const authAPI = {
  register:       (data)  => api.post('/auth/register', data),
  login:          (data)  => api.post('/auth/login', data),
  logout:         ()      => api.post('/auth/logout'),
  getMe:          ()      => api.get('/auth/me'),
  updateProfile:  (data)  => api.put('/auth/me', data),
  changePassword: (data)  => api.post('/auth/change-password', data),
  refresh:        (token) => api.post('/auth/refresh', { refresh_token: token }),
};

// ─────────────────────────────────────────────────────────────
// PRODUCTS ENDPOINTS
// ─────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll:      (params) => api.get('/products', { params }),
  getById:     (id)     => api.get(`/products/${id}`),
  getMyProducts:(params)=> api.get('/products/my-products', { params }),
  create:      (data)   => api.post('/products', data),
  update:      (id,data)=> api.put(`/products/${id}`, data),
  delete:      (id)     => api.delete(`/products/${id}`),
};

// ─────────────────────────────────────────────────────────────
// CATEGORIES ENDPOINTS
// ─────────────────────────────────────────────────────────────
export const categoriesAPI = {
  getAll:    ()    => api.get('/categories'),
  getById:   (id)  => api.get(`/categories/${id}`),
  getBySlug: (slug)=> api.get(`/categories/slug/${slug}`),
};

// ─────────────────────────────────────────────────────────────
// SELLERS ENDPOINTS
// ─────────────────────────────────────────────────────────────
export const sellersAPI = {
  getAll:      (params) => api.get('/sellers', { params }),
  getById:     (id)     => api.get(`/sellers/${id}`),
  getMe:       ()       => api.get('/sellers/me'),
  getAnalytics:()       => api.get('/sellers/analytics'),
  create:      (data)   => api.post('/sellers', data),
  update:      (id,data)=> api.put(`/sellers/${id}`, data),
};

// ─────────────────────────────────────────────────────────────
// ORDERS ENDPOINTS
// ─────────────────────────────────────────────────────────────
export const ordersAPI = {
  getAll:       (params)       => api.get('/orders', { params }),
  getById:      (id)           => api.get(`/orders/${id}`),
  create:       (data)         => api.post('/orders', data),
  updateStatus: (id, data)     => api.patch(`/orders/${id}/status`, data),
};

// ─────────────────────────────────────────────────────────────
// REVIEWS ENDPOINTS
// ─────────────────────────────────────────────────────────────
export const reviewsAPI = {
  getProductReviews: (id, params) => api.get(`/reviews/product/${id}`, { params }),
  getSellerRatings:  (id, params) => api.get(`/reviews/seller/${id}`, { params }),
  createReview:      (data)       => api.post('/reviews/product', data),
  createRating:      (data)       => api.post('/reviews/seller', data),
  deleteReview:      (id)         => api.delete(`/reviews/${id}`),
};

// ─────────────────────────────────────────────────────────────
// WISHLIST ENDPOINTS
// ─────────────────────────────────────────────────────────────
export const wishlistAPI = {
  getAll:  (params)=> api.get('/wishlist', { params }),
  add:     (data)  => api.post('/wishlist', data),
  remove:  (id)    => api.delete(`/wishlist/${id}`),
  check:   (id)    => api.get(`/wishlist/${id}/check`),
};

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS ENDPOINTS
// ─────────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll:       (params) => api.get('/notifications', { params }),
  getUnreadCount:()      => api.get('/notifications/unread-count'),
  markAsRead:   (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead:  ()       => api.patch('/notifications/mark-all-read'),
  delete:       (id)     => api.delete(`/notifications/${id}`),
};

// ─────────────────────────────────────────────────────────────
// UPLOADS ENDPOINTS
// ─────────────────────────────────────────────────────────────
export const uploadsAPI = {
  uploadImage: (file, bucket = 'products') => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/uploads/image?bucket=${bucket}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadImages: (files, bucket = 'products') => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return api.post(`/uploads/images?bucket=${bucket}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
