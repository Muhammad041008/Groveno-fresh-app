import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { MOCK_OTP_BACKEND } from '../constants/data';

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

export async function verifyOtp(
  phone: string,
  _otp: string
): Promise<{ token: string; user: User }> {
  // Backend uses mock OTP 123456; any 4-digit input on client side maps to it
  const res = await api.post('/api/auth/verify-otp', {
    phone,
    otp: MOCK_OTP_BACKEND,
  });
  const { token, user } = res.data;
  await AsyncStorage.setItem('groveno_token', token);
  await AsyncStorage.setItem('groveno_user', JSON.stringify(user));
  return { token, user };
}

export async function getMe(): Promise<User> {
  const res = await api.get('/api/auth/me');
  return res.data.user ?? res.data;
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
