import { useMemo } from 'react';
import {
  apiUtils,
  authAPI,
  categoriesAPI,
  notificationsAPI,
  ordersAPI,
  productsAPI,
  reviewsAPI,
  sellersAPI,
  uploadsAPI,
  wishlistAPI,
} from '../services/api';

export function useApi() {
  return useMemo(() => ({
    apiUtils,
    authAPI,
    productsAPI,
    categoriesAPI,
    sellersAPI,
    ordersAPI,
    reviewsAPI,
    wishlistAPI,
    notificationsAPI,
    uploadsAPI,
  }), []);
}
