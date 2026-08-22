import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export interface User {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  walletBalance: number;
  coins: number;
  referralCode?: string;
}

// Demo-mode constants
const DEMO_PHONE_RAW = '1234567890';
const DEMO_PHONE_E164 = '+911234567890';
const DEMO_OTP = '1234';
// Offline sentinel — used ONLY when the backend is genuinely unreachable
const DEMO_TOKEN_OFFLINE = 'demo_jwt_groveno_offline';

export async function sendOtp(phone: string): Promise<void> {
  await api.post('/api/auth/send-otp', { phone });
}


/**
 * Validates that the currently stored token is still accepted by the backend.
 * Called by AuthContext on every app startup to catch stale/expired JWTs.
 *
 * - Demo sentinel → always valid (offline demo mode).
 * - No token       → invalid.
 * - Real JWT + 200  → valid.
 * - Real JWT + 401  → invalid (JWT expired/revoked); token is cleared.
 * - Real JWT + network error → treated as valid (user may be offline).
 */
export async function validateToken(): Promise<boolean> {
  const tok = await AsyncStorage.getItem('groveno_token');
  if (!tok) return false;
  if (tok === DEMO_TOKEN_OFFLINE) {
    console.log('[AUTH_DEBUG] validateToken: demo sentinel present — skipping backend validation');
    return true;
  }
  try {
    await api.get('/api/auth/me');
    console.log('[AUTH_DEBUG] validateToken: backend confirmed token valid');
    return true;
  } catch (err: any) {
    if (err?.response?.status === 401) {
      // Backend explicitly rejected the JWT; remove it now so AuthContext doesn't
      // need a second pass. The response interceptor will also call _unauthorizedHandler.
      console.warn('[AUTH_DEBUG] validateToken: backend returned 401 — token is stale, cleared');
      await AsyncStorage.removeItem('groveno_token');
      return false;
    }
    // Network error or 5xx — optimistically keep the user in
    console.warn('[AUTH_DEBUG] validateToken: network/server error, keeping token:', err?.message);
    return true;
  }
}

/**
 * Verifies OTP for the demo phone (+911234567890 / OTP 1234).
 *
 * Priority order:
 *  1. Calls the real backend POST /api/auth/verify-otp — backend has native support for
 *     these demo credentials and will issue a genuine customer JWT.
 *  2. Falls back to the offline sentinel ONLY when the backend is unreachable
 *     (network error / timeout — Axios sets no .response in that case).
 *     This keeps Demo Mode working without internet while ensuring that when
 *     the backend IS reachable the mobile stores a verifiable JWT.
 *
 * If credentials are not the demo combination, throws immediately.
 * Does NOT log the actual token value.
 */
export async function verifyOtpMock(
  phone: string,
  otp: string
): Promise<{ token: string; user: User }> {
  const normalised = phone.startsWith('+') ? phone : `+91${phone}`;
  const isDemo = normalised === DEMO_PHONE_E164 && otp === DEMO_OTP;

  if (!isDemo) {
    throw new Error('Demo Mode: use phone 1234567890 with OTP 1234.');
  }

  try {
    // Call the real backend — it natively accepts DEMO_PHONE_E164 + DEMO_OTP
    const res = await api.post('/api/auth/verify-otp', { phone: normalised, otp });
    const { token, user } = res.data as { token: string; user: User };
    await AsyncStorage.setItem('groveno_token', token);
    await AsyncStorage.setItem('groveno_user', JSON.stringify(user));
    return { token, user };
  } catch (err: any) {
    // Backend returned an HTTP error (4xx/5xx) — propagate so the real error surfaces in UI.
    if (err?.response) {
      throw err;
    }

    // Axios request timeout (ECONNABORTED): backend may be reachable but slow.
    // Never silently switch to demo mode on a timeout — throw instead so the user retries.
    if (err?.code === 'ECONNABORTED') {
      throw new Error('OTP verification timed out. Please check your connection and try again.');
    }

    // Genuine network unavailability (ERR_NETWORK / no connectivity at all).
    // Fall back to offline demo sentinel so the app works without internet.
    console.warn('[verifyOtpMock] Backend unreachable (device appears offline) — using offline demo sentinel');
    const demoUser: User = {
      _id: 'demo_user_001',
      name: 'Demo User',
      phone: DEMO_PHONE_E164,
      email: 'demo@groveno.com',
      walletBalance: 250,
      coins: 120,
      referralCode: 'DEMO123',
    };
    await AsyncStorage.setItem('groveno_token', DEMO_TOKEN_OFFLINE);
    await AsyncStorage.setItem('groveno_user', JSON.stringify(demoUser));
    return { token: DEMO_TOKEN_OFFLINE, user: demoUser };
  }
}

/**
 * Firebase path: sends { firebaseToken } to the backend.
 * Backend verifies the token with Firebase Admin SDK and issues a JWT.
 */
export async function verifyOtpFirebase(
  firebaseIdToken: string
): Promise<{ token: string; user: User }> {
  const res = await api.post('/api/auth/verify-otp', { firebaseToken: firebaseIdToken });
  const { token, user } = res.data;
  await AsyncStorage.setItem('groveno_token', token);
  await AsyncStorage.setItem('groveno_user', JSON.stringify(user));
  return { token, user };
}

export async function getMe(): Promise<User> {
  try {
    const res = await api.get('/api/auth/me');
    const u: User = res.data.user ?? res.data;
    // Keep local cache fresh
    await AsyncStorage.setItem('groveno_user', JSON.stringify(u));
    return u;
  } catch {
    // Fall back to locally stored user (works offline)
    const local = await getLocalUser();
    if (local) return local;
    throw new Error('Not authenticated');
  }
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  const res = await api.put('/api/auth/profile', data);
  return res.data.user ?? res.data;
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove(['groveno_token', 'groveno_user', 'groveno_onboarding']);
}

export async function getLocalUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem('groveno_user');
  return raw ? (JSON.parse(raw) as User) : null;
}
