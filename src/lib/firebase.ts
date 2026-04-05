
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableNetwork } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB7ovkBTgi1QVzFYrQ9XUTRm4VjhLCuwBk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "retailer-app-2.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "retailer-app-2",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "retailer-app-2.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "540074563965",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:540074563965:web:f5ff5df0733827e0a7d414"
};

if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.warn("⚠️ Firebase environment variables are missing! Make sure to add them in your Vercel project settings.");
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
try {
  // Note: enableNetwork() will fail if called after any other Firestore operations.
  // It's safe to call multiple times, but good practice to handle the error.
  enableNetwork(db);
} catch (error) {
  if ((error as any).code !== 'failed-precondition') {
    console.error("Error enabling Firestore network:", error);
  }
}
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
