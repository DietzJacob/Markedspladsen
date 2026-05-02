import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDTtls7dUhs12Hn-fubi_TzU0_LSAN1saY",
  authDomain: "markedspuls-bb6c9.firebaseapp.com",
  projectId: "markedspuls-bb6c9",
  storageBucket: "markedspuls-bb6c9.firebasestorage.app",
  messagingSenderId: "959641914634",
  appId: "1:959641914634:web:a4977848cf6ee0405abef3",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
