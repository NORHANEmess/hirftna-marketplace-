/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  authAPI,
  clearStoredSession,
  extractApiEntity,
  getCachedUser,
  getStoredSession,
  isTerminalAuthError,
  isTransientApiError,
  storeSession,
  updateStoredUser,
} from '../services/api';

const AuthContext = createContext(null);

let bootstrapPromise = null;

function getInitialUser() {
  return getCachedUser();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('hirftna_token')));
  const [pendingOtp, setPendingOtp] = useState(null);

  const persistSession = useCallback((session) => {
    const nextUser = session?.user ?? null;
    const isAuthenticated = Boolean(session?.token && nextUser);

    if (!isAuthenticated) {
      clearStoredSession();
      setUser(null);
      return { user: null, isAuthenticated: false };
    }

    storeSession(session);
    setUser(nextUser);
    return { user: nextUser, isAuthenticated: true };
  }, []);

  const clearAuthState = useCallback(() => {
    clearStoredSession();
    setUser(null);
    setPendingOtp(null);
  }, []);

  useEffect(() => {
    const { token } = getStoredSession();

    if (!token) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    if (!bootstrapPromise) {
      bootstrapPromise = authAPI.getMe({ force: true })
        .then((response) => {
          const nextUser = extractApiEntity(response, 'user');
          if (!nextUser) {
            throw new Error('Missing user profile');
          }

          updateStoredUser(nextUser);
          return nextUser;
        })
        .finally(() => {
          bootstrapPromise = null;
        });
    }

    bootstrapPromise
      .then((nextUser) => {
        if (!active) {
          return;
        }

        setUser(nextUser);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        if (isTerminalAuthError(error)) {
          clearAuthState();
          return;
        }

        if (!isTransientApiError(error)) {
          clearAuthState();
          return;
        }

        const fallbackUser = getCachedUser();
        if (fallbackUser) {
          setUser(fallbackUser);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [clearAuthState]);

  const login = useCallback(async (email, password) => {
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password });
      const payload = response.data?.data ?? {};

      if (payload.requires_otp) {
        const otpSession = {
          otp_token: payload.otp_token,
          otp_expires_in: payload.otp_expires_in,
          user: payload.user,
        };

        setPendingOtp(otpSession);
        return { requiresOtp: true, pendingOtp: otpSession };
      }

      setPendingOtp(null);
      const result = persistSession(payload);
      return { ...result, requiresOtp: false };
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const verifyOtp = useCallback(async (payload) => {
    setLoading(true);

    try {
      const response = await authAPI.verifyOtp(payload);
      const result = persistSession(response.data?.data);
      setPendingOtp(null);
      return result;
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const clearPendingOtp = useCallback(() => {
    setPendingOtp(null);
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true);

    try {
      const response = await authAPI.register(payload);
      const data = response.data?.data ?? {};

      if (data.requires_otp) {
        const otpSession = {
          otp_token: data.otp_token,
          otp_expires_in: data.otp_expires_in,
          user: data.user,
        };

        setPendingOtp(otpSession);
        return { requiresOtp: true, pendingOtp: otpSession };
      }

      setPendingOtp(null);
      const result = persistSession(data);
      return { ...result, requiresOtp: false };
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const logout = useCallback(async () => {
    setLoading(true);

    try {
      await authAPI.logout();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Logout API failed, clearing local session anyway.', error);
      }
    } finally {
      clearAuthState();
      setLoading(false);
    }
  }, [clearAuthState]);

  const updateUser = useCallback((updatedUser) => {
    setUser((currentUser) => {
      const nextUser = currentUser ? { ...currentUser, ...updatedUser } : updatedUser;
      updateStoredUser(nextUser);
      return nextUser;
    });
  }, []);

  const changePassword = useCallback(async (payload) => {
    const response = await authAPI.changePassword(payload);
    return response.data?.data ?? null;
  }, []);

  const value = useMemo(() => {
    const isAuthenticated = Boolean(user);

    return {
      user,
      loading,
      pendingOtp,
      login,
      verifyOtp,
      clearPendingOtp,
      register,
      logout,
      clearSession: clearAuthState,
      updateUser,
      changePassword,
      isAuthenticated,
      isClient: user?.role === 'client',
      isSeller: user?.role === 'seller',
      isAdmin: user?.role === 'admin',
    };
  }, [
    user,
    loading,
    pendingOtp,
    login,
    verifyOtp,
    clearPendingOtp,
    register,
    logout,
    clearAuthState,
    updateUser,
    changePassword,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
