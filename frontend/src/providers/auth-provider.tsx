'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  avatar_url: string | null;
  points: number;
  tier: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch {
      setUser(null);
      api.clearToken();
    }
  }, []);

  // Auto-logout on 401 (expired token)
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('wimc:auth-expired', handler);
    return () => window.removeEventListener('wimc:auth-expired', handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('wimc_token');
    if (token) {
      // Timeout: if auth check takes >5s (e.g. backend unreachable), stop loading
      const timeout = setTimeout(() => {
        setUser(null);
        setLoading(false);
      }, 5000);
      refreshUser().finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const result = await api.login({ email, password });
    api.setToken(result.session.access_token);
    await refreshUser();
  };

  const register = async (email: string, password: string, role: string, displayName: string) => {
    const result = await api.register({ email, password, role, displayName });
    api.setToken(result.session.access_token);
    await refreshUser();
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function useRequireAuth(options?: { role?: string | string[]; redirectTo?: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(options?.redirectTo || '/auth/login');
      return;
    }
    if (options?.role) {
      const roles = Array.isArray(options.role) ? options.role : [options.role];
      if (!roles.includes(user.role)) {
        router.replace('/');
      }
    }
  }, [user, loading, router, options?.role, options?.redirectTo]);

  const authorized = !loading && !!user && (
    !options?.role || (Array.isArray(options.role) ? options.role : [options.role]).includes(user.role)
  );

  return { user, loading, authorized };
}
