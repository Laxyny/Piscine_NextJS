let adminAuth = null;

try {
  const fs = require('fs');
  const path = require('path');
  let cred = null;
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (keyPath && typeof keyPath === 'string') {
    const resolved = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), keyPath);
    if (fs.existsSync(resolved)) {
      cred = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    }
  } else if (key && typeof key === 'string') {
    cred = JSON.parse(key);
  }
  if (cred) {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(cred) });
    }
    adminAuth = admin.auth();
  }
} catch (e) {
  console.warn('Firebase Admin init skipped:', e.message);
}

export function getAdminAuth() {
  return adminAuth;
}
