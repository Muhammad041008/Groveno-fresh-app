/**
 * Lightweight singleton store for the Firebase confirmation result.
 * React Navigation params must be serializable, so we store the
 * ConfirmationResult object here instead of in navigation params.
 *
 * Also exposes the firebase/auth module with a safe dynamic import so
 * that Expo Go (which doesn't have native Firebase built in) doesn't crash.
 */

// Dynamically require firebase auth to avoid crashing in Expo Go
let _authModule: any = null;
try {
  _authModule = require('@react-native-firebase/auth').default;
} catch {
  // Native module not available — Expo Go or pre-built app without Firebase
  _authModule = null;
}

export const firebaseAuth = _authModule;

/** True when the native Firebase auth module is available (i.e. in a dev/prod build). */
export const isFirebaseAvailable = _authModule !== null;

// ── Confirmation result store ────────────────────────────────────────────────

let _confirmationResult: any = null;

export function setConfirmationResult(result: any): void {
  _confirmationResult = result;
}

export function getConfirmationResult(): any {
  return _confirmationResult;
}

export function clearConfirmationResult(): void {
  _confirmationResult = null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** The demo phone (no country code) that bypasses Firebase and uses mock OTP 1234. */
export const DEMO_PHONE_RAW = '1234567890';
export const DEMO_PHONE_E164 = '+911234567890';

export function isDemoPhone(phone: string): boolean {
  return phone === DEMO_PHONE_RAW || phone === DEMO_PHONE_E164;
}
