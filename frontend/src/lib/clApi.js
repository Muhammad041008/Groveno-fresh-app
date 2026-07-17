import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_BACKEND_URL || '';

export const clApi = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

clApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('groveno_cl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

clApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      if (path.startsWith('/cl') && path !== '/cl/login') {
        localStorage.removeItem('groveno_cl_token');
        localStorage.removeItem('groveno_cl_user');
        window.location.href = '/cl/login';
      }
    }
    return Promise.reject(err);
  }
);

export default clApi;
