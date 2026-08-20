import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// Offline demo sentinel — set by authService when the backend is unreachable
const DEMO_SENTINEL = 'demo_jwt_groveno_offline';

// Called by AuthContext to handle mid-session 401 (session expired / token revoked).
// The callback should clear isLoggedIn and route the user to the Login screen.
type UnauthorizedHandler = () => void;
let _unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  _unauthorizedHandler = handler;
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── REQUEST interceptor ──────────────────────────────────────────────────────
// Reads the stored JWT and attaches it as a Bearer token before every request.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('groveno_token');

  // [AUTH_DEBUG] — remove these three lines once the auth issue is confirmed fixed
  const path = (config.url ?? '').replace(config.baseURL ?? '', '');
  if (token) {
    console.log(`[AUTH_DEBUG] request → ${path} | token present (${token.length} chars, demo=${token === DEMO_SENTINEL})`);
  } else {
    console.warn(`[AUTH_DEBUG] request → ${path} | NO TOKEN IN ASYNCSTORAGE — Authorization header will be absent`);
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── RESPONSE interceptor ─────────────────────────────────────────────────────
// On 401 with a real JWT: removes the stale token and notifies the app so it
// can redirect the user to the Login screen.
// The demo sentinel is intentionally NOT removed on 401 — it stays for offline
// Demo Mode so the local fallbacks in each service continue to work.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const tok = await AsyncStorage.getItem('groveno_token');
      if (tok && tok !== DEMO_SENTINEL) {
        console.warn('[AUTH_DEBUG] 401 received with real JWT — removing stale token and notifying app');
        await AsyncStorage.removeItem('groveno_token');
        // Notify AuthContext so the UI redirects to Login immediately
        _unauthorizedHandler?.();
      }
    }
    return Promise.reject(err);
  }
);

export default api;
