/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api';
 
const AuthContext = createContext(null);
 
const AUTH_STORAGE_KEYS = [
  'hirftna_token',
  'hirftna_refresh_token',
  'hirftna_user',
];
 
function clearAuthStorage() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}
 
function getStoredUser() {
  const storedUser = localStorage.getItem('hirftna_user');
  const token      = localStorage.getItem('hirftna_token');
 
  if (!storedUser || !token) return null;
 
  try {
    return JSON.parse(storedUser);
  } catch {
    clearAuthStorage();
    return null;
  }
}
 
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(getStoredUser);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('hirftna_token')));

  useEffect(() => {
    const token = localStorage.getItem('hirftna_token');

    if (!token) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    const syncUser = async () => {
      setLoading(true);

      try {
        const response = await authAPI.getMe();
        const nextUser =
          response?.data?.data?.user ??
          response?.data?.user ??
          response?.data?.data ??
          null;

        if (!nextUser) {
          throw new Error('Missing user profile');
        }

        if (!isMounted) return;

        localStorage.setItem('hirftna_user', JSON.stringify(nextUser));
        setUser(nextUser);
      } catch {
        if (!isMounted) return;

        clearAuthStorage();
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    syncUser();

    return () => {
      isMounted = false;
    };
  }, []);
 
  // ── Persist session to localStorage + state ───────────
  const persistSession = useCallback((data) => {
    const nextUser = data?.user ?? null;
    const isAuthenticated = Boolean(data?.token && nextUser);

    if (isAuthenticated) {
      localStorage.setItem('hirftna_token', data.token);
      localStorage.setItem('hirftna_refresh_token', data.refresh_token);
      localStorage.setItem('hirftna_user', JSON.stringify(nextUser));
      setUser(nextUser);
    } else {
      clearAuthStorage();
      setUser(null);
    }

    return { user: nextUser, isAuthenticated };
  }, []);
 
  // ── Login ─────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      return persistSession(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [persistSession]);
 
  // ── Register ──────────────────────────────────────────
  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const res = await authAPI.register(payload);
      return persistSession(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [persistSession]);
 
  // ── Logout ────────────────────────────────────────────
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authAPI.logout();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Logout API failed — clearing local session anyway.', error);
      }
    } finally {
      clearAuthStorage();
      setUser(null);
      setLoading(false);
    }
  }, []);
 
  // ── Update user in state + storage ────────────────────
  const updateUser = useCallback((updated) => {
    setUser((currentUser) => {
      const mergedUser = currentUser ? { ...currentUser, ...updated } : updated;
      localStorage.setItem('hirftna_user', JSON.stringify(mergedUser));
      return mergedUser;
    });
  }, []);
 
  // ── Computed ──────────────────────────────────────────
  const isAuthenticated = !!user;
  const isClient        = user?.role === 'client';
  const isSeller        = user?.role === 'seller';
  const isAdmin         = user?.role === 'admin';
 
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateUser,
      isAuthenticated,
      isClient,
      isSeller,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
 
// ── Custom hook ───────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
