import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAZB7tkNZQM5BIIUHKN173VYzOho27Du5Q",
    authDomain: "thesimpletechie-22920.firebaseapp.com",
    projectId: "thesimpletechie-22920",
    storageBucket: "thesimpletechie-22920.firebasestorage.app",
    messagingSenderId: "1098827288754",
    appId: "1:1098827288754:web:85c1fac2ea5466906c79ab",
    measurementId: "G-LZNDY8RSTK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
