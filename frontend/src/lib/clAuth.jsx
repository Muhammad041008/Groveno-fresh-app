import { createContext, useContext, useEffect, useState } from 'react';
import clApi from './clApi';

const CLAuthContext = createContext(null);

export function CLAuthProvider({ children }) {
  const [cl, setCl] = useState(() => {
    try { return JSON.parse(localStorage.getItem('groveno_cl_user') || 'null'); }
    catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('groveno_cl_token') || null);
  const [loading, setLoading] = useState(!!token && !cl);

  useEffect(() => {
    if (token && !cl) {
      clApi.get('/cl/me')
        .then((r) => {
          setCl(r.data.cl);
          localStorage.setItem('groveno_cl_user', JSON.stringify(r.data.cl));
        })
        .catch(() => {
          localStorage.removeItem('groveno_cl_token');
          localStorage.removeItem('groveno_cl_user');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
     
  }, []);

  const login = async (email, password) => {
    const { data } = await clApi.post('/cl/auth/login', { email, password });
    localStorage.setItem('groveno_cl_token', data.token);
    localStorage.setItem('groveno_cl_user', JSON.stringify(data.cl));
    setToken(data.token);
    setCl(data.cl);
    return data;
  };

  const refresh = async () => {
    const { data } = await clApi.get('/cl/me');
    setCl(data.cl);
    localStorage.setItem('groveno_cl_user', JSON.stringify(data.cl));
    return data.cl;
  };

  const logout = () => {
    localStorage.removeItem('groveno_cl_token');
    localStorage.removeItem('groveno_cl_user');
    setToken(null);
    setCl(null);
  };

  return (
    <CLAuthContext.Provider value={{ cl, token, loading, login, logout, refresh, setCl }}>
      {children}
    </CLAuthContext.Provider>
  );
}

export const useCLAuth = () => useContext(CLAuthContext);
