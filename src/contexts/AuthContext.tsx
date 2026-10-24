import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LoginPayload, RegisterPayload, User } from '@/types/contracts';
import {
  getStoredSession,
  setStoredSession,
  StoredAuthSession,
  subscribeAuthSession,
} from '@/services/authStore';
import { api } from '@/services/api';
import { clearPrivateUserCache, queryClient } from '@/services/queryClient';
import { resetRealtimeStateForSessionChange } from '@/services/realtime';

interface AuthModalState {
  isOpen: boolean;
  mode: 'login' | 'register';
  returnTo?: string;
  expiredMessage?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isCheckingSession: boolean;
  authModal: AuthModalState;
  openAuthModal: (mode?: 'login' | 'register', returnTo?: string, expiredMessage?: string) => void;
  closeAuthModal: () => void;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<StoredAuthSession | null>(() => getStoredSession());
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(false);
  const [authModal, setAuthModal] = useState<AuthModalState>({
    isOpen: false,
    mode: 'login',
  });

  useEffect(() => {
    return subscribeAuthSession((next) => {
      setSession(next);
    });
  }, []);

  useEffect(() => {
    const initial = getStoredSession();
    if (!initial?.token) return;
    let active = true;
    setIsCheckingSession(true);
    api
      .getSession()
      .then((res) => {
        if (!active) return;
        setStoredSession(res);
      })
      .catch(() => {
        if (!active) return;
        setStoredSession(null);
        clearPrivateUserCache();
        resetRealtimeStateForSessionChange(null);
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ message?: string }>;
      clearPrivateUserCache();
      resetRealtimeStateForSessionChange(null);
      setAuthModal({
        isOpen: true,
        mode: 'login',
        returnTo: window.location.pathname + window.location.search,
        expiredMessage:
          custom.detail?.message ||
          'Sua sessão expirou. Faça login novamente para retomar de onde parou.',
      });
    };
    window.addEventListener('kurio:session-expired', handler);
    return () => window.removeEventListener('kurio:session-expired', handler);
  }, []);

  const openAuthModal = useCallback(
    (mode: 'login' | 'register' = 'login', returnTo?: string, expiredMessage?: string) => {
      setAuthModal({
        isOpen: true,
        mode,
        returnTo,
        expiredMessage,
      });
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setAuthModal((prev) => ({ ...prev, isOpen: false, expiredMessage: undefined }));
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    const prevUserId = getStoredSession()?.user?.id;
    const res = await api.login(payload);
    if (prevUserId && prevUserId !== res.user.id) {
      clearPrivateUserCache();
    }
    setStoredSession(res);
    resetRealtimeStateForSessionChange(res.token);
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.invalidateQueries({ queryKey: ['quote'] });
    queryClient.invalidateQueries({ queryKey: ['favorites', res.user.id] });
    queryClient.invalidateQueries({ queryKey: ['wallets', res.user.id] });
    return res.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<User> => {
    const prevUserId = getStoredSession()?.user?.id;
    const res = await api.register(payload);
    if (prevUserId && prevUserId !== res.user.id) {
      clearPrivateUserCache();
    }
    setStoredSession(res);
    resetRealtimeStateForSessionChange(res.token);
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.invalidateQueries({ queryKey: ['quote'] });
    queryClient.invalidateQueries({ queryKey: ['favorites', res.user.id] });
    return res.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      void 0;
    }
    setStoredSession(null);
    clearPrivateUserCache();
    resetRealtimeStateForSessionChange(null);
  }, []);

  const refreshUser = useCallback((updatedUser: User) => {
    const current = getStoredSession();
    if (current) {
      setStoredSession({
        ...current,
        user: updatedUser,
      });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        token: session?.token ?? null,
        isAuthenticated: Boolean(session?.user && session?.token),
        isCheckingSession,
        authModal,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

