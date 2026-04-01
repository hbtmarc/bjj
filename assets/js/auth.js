import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth, googleProvider } from "./firebase.js";

export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithEmail({ email, senha }) {
  return signInWithEmailAndPassword(auth, email, senha);
}

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function logoutUser() {
  return signOut(auth);
}
