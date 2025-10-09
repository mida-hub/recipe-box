import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "recipe-box-474414.firebaseapp.com",
  projectId: "recipe-box-474414",
  storageBucket: "recipe-box-474414.firebasestorage.app",
  messagingSenderId: "660500024721",
  appId: "1:660500024721:web:68a11da8c5afcad411de30",
  measurementId: "G-1PGLSTETB4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
