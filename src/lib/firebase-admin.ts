import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminApp: App;

if (!getApps().length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
      // Fallback: try application default credentials (works in Firebase App Hosting / GCP)
      adminApp = initializeApp();
    }
  } else {
    // No service account key — use application default credentials
    // This works automatically on Firebase App Hosting and GCP environments
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_KEY not set. Using application default credentials.");
    adminApp = initializeApp();
  }
} else {
  adminApp = getApps()[0];
}

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
