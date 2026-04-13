import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAtQ4-tGis920IudDavTOyJtBgSsFcIcDw",
  authDomain: "cityconnect-c7be4.firebaseapp.com",
  projectId: "cityconnect-c7be4",
  storageBucket: "cityconnect-c7be4.firebasestorage.app",
  messagingSenderId: "644094288702",
  appId: "1:644094288702:web:15e122e9cefb609c76c26f",
  measurementId: "G-MPXQBVT9J2"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
