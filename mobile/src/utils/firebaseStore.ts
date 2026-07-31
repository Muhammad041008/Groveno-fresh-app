/**
 * Firebase store — pure demo/mock mode.
 * Firebase native modules are NOT installed (they require a dev build).
 * All phones use the demo path: phone 1234567890 → OTP 1234.
 * Real Firebase auth can be added later with @react-native-firebase in a dev build.
 */

export const firebaseAuth: any = null;  // null = Expo Go; auth() instance = dev build
export const isFirebaseAvailable = false;

let _confirmationResult: any = null;
export const setConfirmationResult = (r: any): void => { _confirmationResult = r; };
export const getConfirmationResult = (): any => _confirmationResult;
export const clearConfirmationResult = (): void => { _confirmationResult = null; };

export const DEMO_PHONE_RAW = '1234567890';
export const DEMO_PHONE_E164 = '+911234567890';
export const isDemoPhone = (phone: string): boolean =>
  phone === DEMO_PHONE_RAW || phone === DEMO_PHONE_E164;
