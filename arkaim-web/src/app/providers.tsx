'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { ConfigProvider, App } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getTheme } from '@/shared/lib/theme';
import { WsProvider } from '@/shared/lib/ws-hooks';

// ── Theme Context ──────────────────────────────────

type ThemeContextType = {
  isDark: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggle: () => {} });

export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(saved === 'dark' || (!saved && prefersDark));
  }, []);

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      document.body.classList.toggle('dark', next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      <ConfigProvider theme={getTheme(isDark)}>
        <App>{children}</App>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

// ── Auth Context ───────────────────────────────────

type User = {
  id: string;
  role: 'reader' | 'editor' | 'admin';
  username?: string;
  display_name?: string;
  provider: string;
  is_active?: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const DEV_USER: User = {
      id: 'dev-user-001',
      role: 'admin',
      username: 'developer',
      display_name: 'Разработчик',
      provider: 'dev',
    };

    const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('arkaim_session='));

    const initWithCookie = () => {
      fetch('/auth/me', { credentials: 'same-origin' })
        .then(async (resp) => {
          if (resp.ok) {
            const data = await resp.json();
            if (data.user) { setUser(data.user); setLoading(false); return; }
          }
          setUser(DEV_USER);
          setLoading(false);
        })
        .catch(() => { setUser(DEV_USER); setLoading(false); });
    };

    if (hasCookie) {
      initWithCookie();
    } else {
      // Dev mode: автоматически получаем JWT-cookie через dev-login
      fetch('/api/auth/dev-login', { method: 'POST' })
        .then(resp => resp.ok ? resp.json() : null)
        .then(data => {
          if (data?.ok && data.user) {
            setUser({ ...data.user, provider: data.user.provider || 'dev' });
          } else {
            setUser(DEV_USER);
          }
          setLoading(false);
        })
        .catch(() => { setUser(DEV_USER); setLoading(false); });
    }
  }, []);

  const login = () => { window.location.href = '/login'; };
  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Query Client ───────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Root Provider ──────────────────────────────────

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <WsProvider>
            {children}
          </WsProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
