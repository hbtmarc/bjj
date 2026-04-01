import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  set,
  update,
  get,
  onValue,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBj5NDookHiZy0oPRRCLnrWjfmFkM2XBmw",
  authDomain: "pvault2-marc35.firebaseapp.com",
  projectId: "pvault2-marc35",
  storageBucket: "pvault2-marc35.firebasestorage.app",
  messagingSenderId: "519670184185",
  appId: "1:519670184185:web:dba02b67e82014b0b84a28",
  measurementId: "G-NBHCL8LBJQ",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

async function initAnalyticsIfEnabled(enabled = false) {
  if (!enabled) {
    return null;
  }

  const analyticsModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js");
  const supported = await analyticsModule.isSupported();

  if (!supported) {
    return null;
  }

  return analyticsModule.getAnalytics(app);
}

export {
  app,
  auth,
  db,
  ref,
  push,
  set,
  update,
  get,
  onValue,
  serverTimestamp,
  googleProvider,
  initAnalyticsIfEnabled,
  firebaseConfig,
};
