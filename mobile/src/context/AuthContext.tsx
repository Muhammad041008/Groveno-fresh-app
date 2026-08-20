import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUnauthorizedHandler } from '../services/api';
import { validateToken, logout as serviceLogout } from '../services/authService';

interface AuthContextType {
  isLoggedIn: boolean;
  isReady: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // ── Startup token validation ────────────────────────────────────────────
    // Reading token presence alone is not enough — the JWT may have expired.
    // validateToken() calls /api/auth/me with the stored token.
    // If the backend returns 401, it clears the token and returns false so we
    // land on the Login screen instead of an authenticated screen with no token.
    const init = async () => {
      const token = await AsyncStorage.getItem('groveno_token');
      console.log(`[AUTH_DEBUG] AuthContext startup: token in storage = ${token ? `present (${token.length} chars)` : 'null'}`);
      if (token) {
        const valid = await validateToken();
        console.log(`[AUTH_DEBUG] AuthContext startup: token valid = ${valid}`);
        setIsLoggedIn(valid);
      } else {
        setIsLoggedIn(false);
      }
      setIsReady(true);
    };
    init();

    // ── Mid-session 401 safety net ─────────────────────────────────────────
    // When the Axios response interceptor detects a 401 with a real JWT
    // (i.e. the session expired mid-use), it calls this handler so the app
    // immediately routes the user to the Login screen with a visible message
    // rather than silently leaving them on an authenticated screen with no token.
    setUnauthorizedHandler(() => {
      console.warn('[AUTH_DEBUG] unauthorizedHandler fired — session expired, routing to Login');
      setIsLoggedIn(false);
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again to continue.',
        [{ text: 'OK' }]
      );
    });
  }, []);

  const login = useCallback(() => setIsLoggedIn(true), []);

  const logout = useCallback(async () => {
    await serviceLogout();
    setIsLoggedIn(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
