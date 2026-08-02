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

// Demo-mode constants — intentionally hardcoded, no env required
const DEMO_PHONE_RAW = '1234567890';
const DEMO_PHONE_E164 = '+911234567890';
const DEMO_OTP = '1234';

export async function sendOtp(phone: string): Promise<void> {
  await api.post('/api/auth/send-otp', { phone });
}

/**
 * Demo / offline path.
 * NEVER calls the backend — works with no internet, no .env, no MongoDB.
 * Accepted credentials: phone 1234567890 (or +911234567890), OTP 1234.
 * Any other combination throws a user-friendly error.
 */
export async function verifyOtpMock(
  phone: string,
  otp: string
): Promise<{ token: string; user: User }> {
  const isDemo =
    (phone === DEMO_PHONE_RAW || phone === DEMO_PHONE_E164) &&
    otp === DEMO_OTP;

  if (!isDemo) {
    throw new Error('Demo Mode: use phone 1234567890 with OTP 1234.');
  }

  const demoToken = 'demo_jwt_groveno_offline';
  const demoUser: User = {
    _id: 'demo_user_001',
    name: 'Demo User',
    phone: DEMO_PHONE_E164,
    email: 'demo@groveno.com',
    walletBalance: 250,
    coins: 120,
    referralCode: 'DEMO123',
  };

  await AsyncStorage.setItem('groveno_token', demoToken);
  await AsyncStorage.setItem('groveno_user', JSON.stringify(demoUser));
  return { token: demoToken, user: demoUser };
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
