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

export async function sendOtp(phone: string): Promise<void> {
  await api.post('/api/auth/send-otp', { phone });
}

/**
 * Mock / demo path: sends { phone, otp } to the backend.
 * Used when phone === '1234567890' (demo device) with OTP '1234'.
 */
export async function verifyOtpMock(
  phone: string,
  otp: string
): Promise<{ token: string; user: User }> {
  const res = await api.post('/api/auth/verify-otp', { phone, otp });
  const { token, user } = res.data;
  await AsyncStorage.setItem('groveno_token', token);
  await AsyncStorage.setItem('groveno_user', JSON.stringify(user));
  return { token, user };
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
