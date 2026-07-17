import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('groveno_admin_user') || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('groveno_admin_token') || null);
  const [loading, setLoading] = useState(!!token && !admin);

  useEffect(() => {
    if (token && !admin) {
      api.get('/admin/auth/me')
        .then((r) => {
          setAdmin(r.data.admin);
          localStorage.setItem('groveno_admin_user', JSON.stringify(r.data.admin));
        })
        .catch(() => {
          localStorage.removeItem('groveno_admin_token');
          localStorage.removeItem('groveno_admin_user');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
     
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/admin/auth/login', { email, password });
    localStorage.setItem('groveno_admin_token', data.token);
    localStorage.setItem('groveno_admin_user', JSON.stringify(data.admin));
    setToken(data.token);
    setAdmin(data.admin);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('groveno_admin_token');
    localStorage.removeItem('groveno_admin_user');
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
