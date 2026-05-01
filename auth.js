import { auth, googleProvider } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

await setPersistence(auth, browserLocalPersistence);

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function signInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUpEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signInGoogle() {
  return isMobile
    ? signInWithRedirect(auth, googleProvider)
    : signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export function requireAuth(redirectTo) {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) resolve(user);
      else window.location.replace(redirectTo);
    });
  });
}

export function redirectIfAuthed(redirectTo) {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) window.location.replace(redirectTo);
      else resolve(null);
    });
  });
}

export { auth };
