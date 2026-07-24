const admin = require('firebase-admin');

let _app = null;
let _initAttempted = false;

/**
 * Returns the initialized Firebase Admin app, or null if credentials are missing.
 * Lazy-initializes once and caches the result.
 */
function getFirebaseAdmin() {
  if (_initAttempted) return _app;
  _initAttempted = true;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('[Firebase Admin] Not configured — FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY env vars required.');
    return null;
  }

  try {
    // Prevent duplicate app initialization if already initialized elsewhere
    if (admin.apps.length > 0) {
      _app = admin.app();
      return _app;
    }

    _app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        // Private keys in .env have literal \n sequences — convert to real newlines
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });

    console.log('[Firebase Admin] Initialized successfully for project:', FIREBASE_PROJECT_ID);
    return _app;
  } catch (err) {
    console.error('[Firebase Admin] Initialization failed:', err.message);
    return null;
  }
}

module.exports = { getFirebaseAdmin, admin };
