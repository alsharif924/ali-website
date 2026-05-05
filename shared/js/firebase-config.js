import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// Replace these values with your Firebase project settings
// Firebase Console → Project Settings → Your apps → SDK setup
const firebaseConfig = {
  apiKey: "AIzaSyAmUgfc9pCS9g4-g4H4AoVTSXaEsGw0eNY",
  authDomain: "website-61d2a.firebaseapp.com",
  projectId: "website-61d2a",
  storageBucket: "website-61d2a.firebasestorage.app",
  messagingSenderId: "86580794506",
  appId: "1:86580794506:web:3bdc972ae95e0de3cd8973",
  measurementId: "G-R34GWLGWYD"
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
