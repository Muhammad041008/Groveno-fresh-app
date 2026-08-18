import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('groveno_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Demo sentinel — must match authService.verifyOtpMock
const DEMO_SENTINEL = 'demo_jwt_groveno_offline';

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // Only remove the token when it is a real JWT (i.e. not the offline demo token).
      // Removing the demo sentinel would cause every subsequent request to lack an
      // Authorization header, which surfaces as "No token provided" on the next call.
      const tok = await AsyncStorage.getItem('groveno_token');
      if (tok && tok !== DEMO_SENTINEL) {
        await AsyncStorage.removeItem('groveno_token');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
