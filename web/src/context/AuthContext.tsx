import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthTokens } from '@degrade/shared';
import { ApiClient } from '@degrade/shared';

interface AuthContextType {
  user: User | null;
  tokens: { access: string | null; refresh: string | null };
  api: ApiClient;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
  isLoading: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokensState] = useState<{ access: string | null; refresh: string | null }>(() => {
    return {
      access: localStorage.getItem('degrade-access-token'),
      refresh: localStorage.getItem('degrade-refresh-token'),
    };
  });
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('degrade-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const api = React.useMemo(() => {
    return new ApiClient({
      baseUrl: API_BASE_URL,
      getTokens: () => tokens,
      setTokens: (newTokens) => {
        setTokensState(newTokens);
        localStorage.setItem('degrade-access-token', newTokens.access);
      },
      onUnauthorized: () => {
        logout();
      },
    });
  }, [tokens]);

  useEffect(() => {
    if (tokens.access) {
      api.getMe()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('degrade-user', JSON.stringify(userData));
        })
        .catch(() => {
          // Token expired and refresh failed
          logout();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [tokens.access]);

  const login = (authData: AuthTokens) => {
    setTokensState({ access: authData.access, refresh: authData.refresh });
    setUser(authData.user);
    localStorage.setItem('degrade-access-token', authData.access);
    localStorage.setItem('degrade-refresh-token', authData.refresh);
    localStorage.setItem('degrade-user', JSON.stringify(authData.user));
  };

  const logout = () => {
    setTokensState({ access: null, refresh: null });
    setUser(null);
    localStorage.removeItem('degrade-access-token');
    localStorage.removeItem('degrade-refresh-token');
    localStorage.removeItem('degrade-user');
  };

  return (
    <AuthContext.Provider value={{ user, tokens, api, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
