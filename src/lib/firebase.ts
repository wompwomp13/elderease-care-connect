import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxbN1Nv6-rFkdegCYYpB1XOtfO0lGBjHg",
  authDomain: "elderease-e2ebf.firebaseapp.com",
  projectId: "elderease-e2ebf",
  storageBucket: "elderease-e2ebf.firebasestorage.app",
  messagingSenderId: "236312355615",
  appId: "1:236312355615:web:498434b3b8de5ee8eb062a",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Use long-polling auto-detection to avoid ad-block/firewall issues in dev
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true });

setPersistence(auth, browserLocalPersistence).catch(() => {
  // No-op: fallback to default persistence when blocked
});


